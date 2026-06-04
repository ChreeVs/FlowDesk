import { isSupabaseConfigured, supabase } from './supabase'
import type {
  AppNotification,
  CalendarNote,
  CalendarNoteSummary,
  ClientRequest,
  ClientRequestFile,
  ClientRequestStatus,
  ClientRequestSummary,
  ClientRequestType,
  ClientRequestUpdate,
  Note,
  Project,
  ProjectBundle,
  ProjectEvent,
  ProjectLink,
  ProjectRequestLink,
  ProjectSettings,
  ProjectSummary,
  PublicRequestForm,
  Reminder,
  ReminderStatus,
  SponsorAdBatch,
  SponsorAdBatchStatus,
  SponsorAdBatchSummary,
  SponsorAdPost,
  SocialPost,
  SocialPostSummary,
  Task,
  TaskStatus,
} from '../types'

type ProjectPatch = Pick<Project, 'name'>
type EventPatch = Pick<ProjectEvent, 'text'>
type TaskPatch = Partial<Pick<Task, 'title' | 'status' | 'due_date'>>
type LinkPatch = Partial<Pick<ProjectLink, 'label' | 'url'>>
type ReminderPatch = Partial<
  Pick<Reminder, 'text' | 'remind_at' | 'status' | 'related_task_id'>
>
type ProjectSettingsPatch = Omit<ProjectSettings, 'project_id' | 'updated_at'>
type CalendarNotePatch = Pick<
  CalendarNote,
  'project_id' | 'title' | 'text' | 'label' | 'color' | 'scheduled_at'
>
type SocialPostPatch = Pick<
  SocialPost,
  'project_id' | 'text' | 'media_url' | 'platforms' | 'status' | 'scheduled_at'
>
type SponsorAdBatchPatch = Pick<
  SponsorAdBatch,
  | 'project_id'
  | 'name'
  | 'ad_account_id'
  | 'ad_account_name'
  | 'source_id'
  | 'source_name'
  | 'campaign_id'
  | 'campaign_name'
  | 'adset_id'
  | 'adset_name'
  | 'rule_id'
  | 'rule_name'
  | 'ad_name_pattern'
  | 'create_active'
>
type SponsorAdPostPatch = Pick<
  SponsorAdPost,
  | 'platform'
  | 'source_post_id'
  | 'source_label'
  | 'post_text'
  | 'permalink_url'
  | 'thumbnail_url'
  | 'published_at'
  | 'ad_name'
>
type ClientRequestPatch = {
  title: string
  request_type: ClientRequestType
  urgency: number
  description: string
}
type ClientRequestUpdatePatch = {
  text: string
  file: File | null
}

type LocalDb = {
  projects: Project[]
  project_settings: ProjectSettings[]
  events: ProjectEvent[]
  tasks: Task[]
  notes: Note[]
  links: ProjectLink[]
  reminders: Reminder[]
  calendar_notes: CalendarNote[]
  social_posts: SocialPost[]
  sponsor_ad_batches: SponsorAdBatch[]
  sponsor_ad_posts: SponsorAdPost[]
  request_links: ProjectRequestLink[]
  client_requests: ClientRequest[]
  client_request_files: ClientRequestFile[]
  client_request_updates: ClientRequestUpdate[]
  notifications: AppNotification[]
}

const LOCAL_KEY = 'flowdesk-local-db-v1'

const emptyDb = (): LocalDb => ({
  projects: [],
  project_settings: [],
  events: [],
  tasks: [],
  notes: [],
  links: [],
  reminders: [],
  calendar_notes: [],
  social_posts: [],
  sponsor_ad_batches: [],
  sponsor_ad_posts: [],
  request_links: [],
  client_requests: [],
  client_request_files: [],
  client_request_updates: [],
  notifications: [],
})

const now = () => new Date().toISOString()
const id = () => crypto.randomUUID()
const LOGO_MAX_SIZE = 2 * 1024 * 1024
const REQUEST_FILE_MAX_SIZE = 10 * 1024 * 1024
const LOGO_BUCKET = 'project-assets'
const REQUEST_FILE_BUCKET = 'request-files'
const allowedLogoTypes = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
])
const allowedRequestFileTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'application/zip',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])
const requestTypes = new Set<ClientRequestType>([
  'modifica',
  'nuovo_lavoro',
  'bug',
  'contenuto',
  'grafica',
  'altro',
])

const readDb = (): LocalDb => {
  const raw = localStorage.getItem(LOCAL_KEY)

  if (!raw) {
    return emptyDb()
  }

  try {
    return { ...emptyDb(), ...JSON.parse(raw) }
  } catch {
    return emptyDb()
  }
}

const writeDb = (db: LocalDb) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(db))
}

const byNewest = <T extends { created_at: string }>(items: T[]) =>
  [...items].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

const bySoonest = <T extends { scheduled_at: string }>(items: T[]) =>
  [...items].sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  )

const defaultProjectSettings = (projectId: string): ProjectSettings => ({
  project_id: projectId,
  logo_url: null,
  color: '#6b58d6',
  description: '',
  website_url: '',
  facebook_url: '',
  instagram_url: '',
  linkedin_url: '',
  x_url: '',
  youtube_url: '',
  drive_url: '',
  updated_at: now(),
})

const validateLogoFile = (file: File) => {
  if (!allowedLogoTypes.has(file.type)) {
    throw new Error('Logo non valido. Usa PNG, JPG o WebP.')
  }

  if (file.size > LOGO_MAX_SIZE) {
    throw new Error('Logo troppo grande. Il limite e 2 MB.')
  }
}

const validateRequestFile = (file: File) => {
  if (!allowedRequestFileTypes.has(file.type)) {
    throw new Error(
      'Allegato non valido. Usa immagini, PDF, ZIP, TXT, DOC/DOCX o XLS/XLSX.',
    )
  }

  if (file.size > REQUEST_FILE_MAX_SIZE) {
    throw new Error('Allegato troppo grande. Il limite e 10 MB per file.')
  }
}

const safeFileName = (name: string) =>
  name
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .slice(0, 120) || 'allegato'

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Impossibile leggere il file logo'))
    reader.readAsDataURL(file)
  })

const summarizeCalendarNotes = (
  notes: CalendarNote[],
  projects: Project[],
  settings: ProjectSettings[],
): CalendarNoteSummary[] =>
  bySoonest(notes).map((note) => {
    const project = projects.find((item) => item.id === note.project_id)
    const projectSettings = settings.find(
      (item) => item.project_id === note.project_id,
    )

    return {
      ...note,
      title: note.title || note.text || 'Nota',
      label: note.label || 'FEED',
      color: note.color || '#2f8f56',
      project_name: project?.name ?? 'Progetto',
      project_color: projectSettings?.color ?? '#6b58d6',
    }
  })

const summarizeClientRequests = (
  requests: ClientRequest[],
  projects: Project[],
  files: ClientRequestFile[],
  updates: ClientRequestUpdate[] = [],
): ClientRequestSummary[] =>
  byNewest(requests).map((request) => {
    const project = projects.find((item) => item.id === request.project_id)

    return {
      ...request,
      project_name: project?.name ?? 'Progetto',
      files: files.filter((file) => file.client_request_id === request.id),
      updates: byNewest(
        updates.filter((update) => update.client_request_id === request.id),
      ),
    }
  })

const validateClientRequestPatch = (patch: ClientRequestPatch) => {
  if (!patch.title.trim()) {
    throw new Error('Nome richiesta obbligatorio')
  }

  if (!requestTypes.has(patch.request_type)) {
    throw new Error('Tipo richiesta non valido')
  }

  if (!Number.isInteger(patch.urgency) || patch.urgency < 0 || patch.urgency > 5) {
    throw new Error('Urgenza non valida')
  }
}

const validateClientRequestUpdatePatch = (patch: ClientRequestUpdatePatch) => {
  if (!patch.text.trim() && !patch.file) {
    throw new Error('Inserisci un testo o un file per salvare la gestione')
  }

  if (patch.file) {
    validateRequestFile(patch.file)
  }
}

const summarizeSocialPosts = (
  posts: SocialPost[],
  projects: Project[],
  settings: ProjectSettings[],
): SocialPostSummary[] =>
  bySoonest(posts).map((post) => {
    const project = projects.find((item) => item.id === post.project_id)
    const projectSettings = settings.find(
      (item) => item.project_id === post.project_id,
    )

    return {
      ...post,
      project_name: project?.name ?? 'Progetto',
      project_color: projectSettings?.color ?? '#6b58d6',
    }
  })

const summarizeSponsorAdBatches = (
  batches: SponsorAdBatch[],
  projects: Project[],
  settings: ProjectSettings[],
  posts: SponsorAdPost[],
): SponsorAdBatchSummary[] =>
  byNewest(batches).map((batch) => {
    const project = projects.find((item) => item.id === batch.project_id)
    const projectSettings = settings.find(
      (item) => item.project_id === batch.project_id,
    )

    return {
      ...batch,
      project_name: project?.name ?? 'Progetto',
      project_color: projectSettings?.color ?? '#6b58d6',
      posts: byNewest(posts.filter((post) => post.batch_id === batch.id)),
    }
  })

const validateSponsorAdBatchPatch = (
  patch: SponsorAdBatchPatch,
  posts: SponsorAdPostPatch[],
) => {
  if (!patch.project_id) {
    throw new Error('Seleziona un progetto')
  }

  if (!patch.name.trim()) {
    throw new Error('Nome batch obbligatorio')
  }

  if (!patch.campaign_name.trim() && !patch.campaign_id.trim()) {
    throw new Error('Inserisci almeno nome o ID campagna')
  }

  if (!patch.adset_name.trim() && !patch.adset_id.trim()) {
    throw new Error('Inserisci almeno nome o ID gruppo inserzioni')
  }

  if (posts.length === 0) {
    throw new Error('Aggiungi almeno un post alla lista')
  }
}

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  return supabase
}

const requireAuthenticatedUserId = async () => {
  const client = requireSupabase()
  const { data, error } = await client.auth.getUser()

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error('Login richiesto')
  }

  return data.user.id
}

const unwrap = async <T>(
  request: PromiseLike<{ data: T | null; error: unknown }>,
) => {
  const { data, error } = await request

  if (error) {
    throw error
  }

  if (data === null) {
    throw new Error('Risposta database vuota')
  }

  return data
}

const ensure = async (request: PromiseLike<{ error: unknown }>) => {
  const { error } = await request

  if (error) {
    throw error
  }
}

const supabaseRepository = {
  async listProjects(): Promise<ProjectSummary[]> {
    const client = requireSupabase()
    const projects = await unwrap<Project[]>(
      client.from('projects').select('*').order('created_at', { ascending: false }),
    )
    const tasks = await unwrap<Pick<Task, 'project_id' | 'status'>[]>(
      client.from('tasks').select('project_id,status'),
    )

    return projects.map((project) => ({
      ...project,
      open_tasks: tasks.filter(
        (task) => task.project_id === project.id && task.status === 'todo',
      ).length,
    }))
  },

  async createProject(name: string): Promise<Project> {
    const userId = await requireAuthenticatedUserId()

    return unwrap<Project>(
      requireSupabase()
        .from('projects')
        .insert({ name, user_id: userId })
        .select()
        .single(),
    )
  },

  async updateProject(id: string, patch: ProjectPatch): Promise<Project> {
    return unwrap<Project>(
      requireSupabase()
        .from('projects')
        .update(patch)
        .eq('id', id)
        .select()
        .single(),
    )
  },

  async deleteProject(id: string): Promise<void> {
    await ensure(requireSupabase().from('projects').delete().eq('id', id))
  },

  async getProjectBundle(projectId: string): Promise<ProjectBundle> {
    const client = requireSupabase()
    const [project, settings, events, tasks, notes, links, reminders, socialPosts] =
      await Promise.all([
        unwrap<Project>(
          client.from('projects').select('*').eq('id', projectId).single(),
        ),
        unwrap<ProjectSettings[]>(
          client
            .from('project_settings')
            .select('*')
            .eq('project_id', projectId)
            .limit(1),
        ),
        unwrap<ProjectEvent[]>(
          client
            .from('events')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false }),
        ),
        unwrap<Task[]>(
          client.from('tasks').select('*').eq('project_id', projectId),
        ),
        unwrap<Note[]>(
          client.from('notes').select('*').eq('project_id', projectId).limit(1),
        ),
        unwrap<ProjectLink[]>(
          client
            .from('links')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false }),
        ),
        unwrap<Reminder[]>(
          client.from('reminders').select('*').eq('project_id', projectId),
        ),
        unwrap<SocialPost[]>(
          client.from('social_posts').select('*').eq('project_id', projectId),
        ),
      ])
    let clientRequests: ClientRequest[] = []
    let requestFiles: ClientRequestFile[] = []
    let requestUpdates: ClientRequestUpdate[] = []
    let sponsorAdBatches: SponsorAdBatch[] = []
    let sponsorAdPosts: SponsorAdPost[] = []

    try {
      clientRequests = await unwrap<ClientRequest[]>(
        client
          .from('client_requests')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
      )
      requestFiles =
        clientRequests.length > 0
          ? await unwrap<ClientRequestFile[]>(
              client
                .from('client_request_files')
                .select('*')
                .in(
                  'client_request_id',
                  clientRequests.map((request) => request.id),
                ),
            )
          : []
      requestUpdates =
        clientRequests.length > 0
          ? await unwrap<ClientRequestUpdate[]>(
              client
                .from('client_request_updates')
                .select('*')
                .in(
                  'client_request_id',
                  clientRequests.map((request) => request.id),
                ),
            )
          : []
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : typeof requestError === 'object' &&
              requestError &&
              'message' in requestError
            ? String(requestError.message)
            : ''

      if (
        !message.includes('client_requests') &&
        !message.includes('client_request_files') &&
        !message.includes('client_request_updates')
      ) {
        throw requestError
      }
    }

    try {
      sponsorAdBatches = await unwrap<SponsorAdBatch[]>(
        client
          .from('sponsor_ad_batches')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
      )
      sponsorAdPosts =
        sponsorAdBatches.length > 0
          ? await unwrap<SponsorAdPost[]>(
              client
                .from('sponsor_ad_posts')
                .select('*')
                .in(
                  'batch_id',
                  sponsorAdBatches.map((batch) => batch.id),
                ),
            )
          : []
    } catch (adsError) {
      const message =
        adsError instanceof Error
          ? adsError.message
          : typeof adsError === 'object' && adsError && 'message' in adsError
            ? String(adsError.message)
            : ''

      if (
        !message.includes('sponsor_ad_batches') &&
        !message.includes('sponsor_ad_posts')
      ) {
        throw adsError
      }
    }

    return {
      project,
      settings: settings[0] ?? null,
      events,
      tasks,
      note: notes[0] ?? null,
      links,
      reminders,
      social_posts: socialPosts,
      sponsor_ad_batches: summarizeSponsorAdBatches(
        sponsorAdBatches,
        [project],
        settings,
        sponsorAdPosts,
      ),
      client_requests: summarizeClientRequests(
        clientRequests,
        [project],
        requestFiles,
        requestUpdates,
      ),
    }
  },

  async saveProjectSettings(
    projectId: string,
    patch: ProjectSettingsPatch,
  ): Promise<ProjectSettings> {
    return unwrap<ProjectSettings>(
      requireSupabase()
        .from('project_settings')
        .upsert(
          {
            project_id: projectId,
            ...patch,
          },
          { onConflict: 'project_id' },
        )
        .select()
        .single(),
    )
  },

  async uploadProjectLogo(projectId: string, file: File): Promise<string> {
    validateLogoFile(file)

    const userId = await requireAuthenticatedUserId()
    const extension = allowedLogoTypes.get(file.type)

    if (!extension) {
      throw new Error('Logo non valido. Usa PNG, JPG o WebP.')
    }

    const path = `${userId}/${projectId}/logo.${extension}`
    const client = requireSupabase()
    const { error } = await client.storage
      .from(LOGO_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: true,
      })

    if (error) {
      throw error
    }

    return client.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl
  },

  async getProjectRequestLink(projectId: string): Promise<ProjectRequestLink> {
    const client = requireSupabase()
    const existing = await unwrap<ProjectRequestLink[]>(
      client
        .from('request_links')
        .select('*')
        .eq('project_id', projectId)
        .limit(1),
    )

    if (existing[0]) {
      return existing[0]
    }

    return unwrap<ProjectRequestLink>(
      client
        .from('request_links')
        .insert({ project_id: projectId })
        .select()
        .single(),
    )
  },

  async listProjectClientRequests(
    projectId: string,
  ): Promise<ClientRequestSummary[]> {
    const client = requireSupabase()
    const requests = await unwrap<ClientRequest[]>(
      client
        .from('client_requests')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
    )
    const files =
      requests.length > 0
        ? await unwrap<ClientRequestFile[]>(
            client
              .from('client_request_files')
              .select('*')
              .in(
                'client_request_id',
                requests.map((request) => request.id),
              ),
          )
        : []
    const updates =
      requests.length > 0
        ? await unwrap<ClientRequestUpdate[]>(
            client
              .from('client_request_updates')
              .select('*')
              .in(
                'client_request_id',
                requests.map((request) => request.id),
              ),
          )
        : []
    const projects = await unwrap<Project[]>(
      client.from('projects').select('*').eq('id', projectId),
    )

    return summarizeClientRequests(requests, projects, files, updates)
  },

  async listClientRequests(): Promise<ClientRequestSummary[]> {
    const client = requireSupabase()
    const [requests, projects] = await Promise.all([
      unwrap<ClientRequest[]>(
        client
          .from('client_requests')
          .select('*')
          .order('created_at', { ascending: false }),
      ),
      unwrap<Project[]>(client.from('projects').select('*')),
    ])
    const requestIds = requests.map((request) => request.id)
    const [files, updates] =
      requestIds.length > 0
        ? await Promise.all([
            unwrap<ClientRequestFile[]>(
              client
                .from('client_request_files')
                .select('*')
                .in('client_request_id', requestIds),
            ),
            unwrap<ClientRequestUpdate[]>(
              client
                .from('client_request_updates')
                .select('*')
                .in('client_request_id', requestIds),
            ),
          ])
        : [[], []]

    return summarizeClientRequests(requests, projects, files, updates)
  },

  async updateClientRequestStatus(
    requestId: string,
    status: ClientRequestStatus,
  ): Promise<ClientRequest> {
    return unwrap<ClientRequest>(
      requireSupabase()
        .from('client_requests')
        .update({ status })
        .eq('id', requestId)
        .select()
        .single(),
    )
  },

  async createClientRequestUpdate(
    requestId: string,
    patch: ClientRequestUpdatePatch,
  ): Promise<ClientRequestUpdate> {
    validateClientRequestUpdatePatch(patch)

    const client = requireSupabase()
    const userId = await requireAuthenticatedUserId()
    let fileMeta: Pick<
      ClientRequestUpdate,
      'file_name' | 'file_url' | 'file_path' | 'file_size' | 'mime_type'
    > = {
      file_name: null,
      file_url: null,
      file_path: null,
      file_size: null,
      mime_type: null,
    }

    if (patch.file) {
      const path = `internal/${userId}/${requestId}/${id()}-${safeFileName(
        patch.file.name,
      )}`
      const { error } = await client.storage
        .from(REQUEST_FILE_BUCKET)
        .upload(path, patch.file, {
          cacheControl: '3600',
          contentType: patch.file.type,
          upsert: false,
        })

      if (error) {
        throw error
      }

      fileMeta = {
        file_name: patch.file.name,
        file_url: client.storage.from(REQUEST_FILE_BUCKET).getPublicUrl(path).data
          .publicUrl,
        file_path: path,
        file_size: patch.file.size,
        mime_type: patch.file.type,
      }
    }

    return unwrap<ClientRequestUpdate>(
      client
        .from('client_request_updates')
        .insert({
          client_request_id: requestId,
          user_id: userId,
          text: patch.text.trim(),
          ...fileMeta,
        })
        .select()
        .single(),
    )
  },

  async getPublicRequestForm(token: string): Promise<PublicRequestForm> {
    return unwrap<PublicRequestForm>(
      requireSupabase()
        .rpc('get_public_request_link', { link_token: token })
        .single(),
    )
  },

  async submitPublicClientRequest(
    token: string,
    patch: ClientRequestPatch,
  ): Promise<ClientRequest> {
    validateClientRequestPatch(patch)

    return unwrap<ClientRequest>(
      requireSupabase()
        .rpc('submit_public_client_request', {
          link_token: token,
          request_title: patch.title.trim(),
          request_type_value: patch.request_type,
          request_urgency: patch.urgency,
          request_description: patch.description.trim(),
        })
        .single(),
    )
  },

  async uploadClientRequestFile(
    token: string,
    requestId: string,
    file: File,
  ): Promise<ClientRequestFile> {
    validateRequestFile(file)

    const client = requireSupabase()
    const path = `${token}/${requestId}/${id()}-${safeFileName(file.name)}`
    const { error } = await client.storage
      .from(REQUEST_FILE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      throw error
    }

    const fileUrl = client.storage
      .from(REQUEST_FILE_BUCKET)
      .getPublicUrl(path).data.publicUrl

    return unwrap<ClientRequestFile>(
      client
        .rpc('add_public_client_request_file', {
          link_token: token,
          request_id_value: requestId,
          file_name_value: file.name,
          file_url_value: fileUrl,
          file_path_value: path,
          file_size_value: file.size,
          mime_type_value: file.type,
        })
        .single(),
    )
  },

  async listNotifications(): Promise<AppNotification[]> {
    return unwrap<AppNotification[]>(
      requireSupabase()
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
    )
  },

  async markNotificationRead(id: string): Promise<void> {
    await ensure(
      requireSupabase()
        .from('notifications')
        .update({ status: 'read' })
        .eq('id', id),
    )
  },

  async createEvent(projectId: string, text: string): Promise<ProjectEvent> {
    return unwrap<ProjectEvent>(
      requireSupabase()
        .from('events')
        .insert({ project_id: projectId, text })
        .select()
        .single(),
    )
  },

  async updateEvent(id: string, patch: EventPatch): Promise<ProjectEvent> {
    return unwrap<ProjectEvent>(
      requireSupabase()
        .from('events')
        .update(patch)
        .eq('id', id)
        .select()
        .single(),
    )
  },

  async deleteEvent(id: string): Promise<void> {
    await ensure(requireSupabase().from('events').delete().eq('id', id))
  },

  async createTask(
    projectId: string,
    title: string,
    dueDate: string | null,
  ): Promise<Task> {
    return unwrap<Task>(
      requireSupabase()
        .from('tasks')
        .insert({ project_id: projectId, title, due_date: dueDate })
        .select()
        .single(),
    )
  },

  async updateTask(id: string, patch: TaskPatch): Promise<Task> {
    return unwrap<Task>(
      requireSupabase()
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .select()
        .single(),
    )
  },

  async deleteTask(id: string): Promise<void> {
    await ensure(requireSupabase().from('tasks').delete().eq('id', id))
  },

  async saveNote(
    projectId: string,
    text: string,
    existingId?: string,
  ): Promise<Note> {
    const client = requireSupabase()

    if (existingId) {
      return unwrap<Note>(
        client.from('notes').update({ text }).eq('id', existingId).select().single(),
      )
    }

    return unwrap<Note>(
      client
        .from('notes')
        .insert({ project_id: projectId, text })
        .select()
        .single(),
    )
  },

  async deleteNote(id: string): Promise<void> {
    await ensure(requireSupabase().from('notes').delete().eq('id', id))
  },

  async createLink(
    projectId: string,
    label: string,
    url: string,
  ): Promise<ProjectLink> {
    return unwrap<ProjectLink>(
      requireSupabase()
        .from('links')
        .insert({ project_id: projectId, label, url })
        .select()
        .single(),
    )
  },

  async updateLink(id: string, patch: LinkPatch): Promise<ProjectLink> {
    return unwrap<ProjectLink>(
      requireSupabase()
        .from('links')
        .update(patch)
        .eq('id', id)
        .select()
        .single(),
    )
  },

  async deleteLink(id: string): Promise<void> {
    await ensure(requireSupabase().from('links').delete().eq('id', id))
  },

  async createReminder(
    projectId: string,
    text: string,
    remindAt: string,
    relatedTaskId: string | null,
  ): Promise<Reminder> {
    return unwrap<Reminder>(
      requireSupabase()
        .from('reminders')
        .insert({
          project_id: projectId,
          text,
          remind_at: remindAt,
          related_task_id: relatedTaskId,
        })
        .select()
        .single(),
    )
  },

  async updateReminder(id: string, patch: ReminderPatch): Promise<Reminder> {
    return unwrap<Reminder>(
      requireSupabase()
        .from('reminders')
        .update(patch)
        .eq('id', id)
        .select()
        .single(),
    )
  },

  async deleteReminder(id: string): Promise<void> {
    await ensure(requireSupabase().from('reminders').delete().eq('id', id))
  },

  async listCalendarNotes(): Promise<CalendarNoteSummary[]> {
    const client = requireSupabase()
    const [notes, projects, settings] = await Promise.all([
      unwrap<CalendarNote[]>(
        client.from('calendar_notes').select('*').order('scheduled_at'),
      ),
      unwrap<Project[]>(client.from('projects').select('*')),
      unwrap<ProjectSettings[]>(client.from('project_settings').select('*')),
    ])

    return summarizeCalendarNotes(notes, projects, settings)
  },

  async createCalendarNote(
    patch: CalendarNotePatch,
  ): Promise<CalendarNoteSummary> {
    const client = requireSupabase()
    const created = await unwrap<CalendarNote>(
      client.from('calendar_notes').insert(patch).select().single(),
    )
    const [project, settings] = await Promise.all([
      unwrap<Project>(
        client.from('projects').select('*').eq('id', created.project_id).single(),
      ),
      unwrap<ProjectSettings[]>(
        client
          .from('project_settings')
          .select('*')
          .eq('project_id', created.project_id)
          .limit(1),
      ),
    ])

    return summarizeCalendarNotes(created ? [created] : [], [project], settings)[0]
  },

  async deleteCalendarNote(id: string): Promise<void> {
    await ensure(requireSupabase().from('calendar_notes').delete().eq('id', id))
  },

  async listSocialPosts(): Promise<SocialPostSummary[]> {
    const client = requireSupabase()
    const [posts, projects, settings] = await Promise.all([
      unwrap<SocialPost[]>(
        client.from('social_posts').select('*').order('scheduled_at'),
      ),
      unwrap<Project[]>(client.from('projects').select('*')),
      unwrap<ProjectSettings[]>(client.from('project_settings').select('*')),
    ])

    return summarizeSocialPosts(posts, projects, settings)
  },

  async createSocialPost(patch: SocialPostPatch): Promise<SocialPostSummary> {
    const client = requireSupabase()
    const created = await unwrap<SocialPost>(
      client.from('social_posts').insert(patch).select().single(),
    )
    const [project, settings] = await Promise.all([
      unwrap<Project>(
        client.from('projects').select('*').eq('id', created.project_id).single(),
      ),
      unwrap<ProjectSettings[]>(
        client
          .from('project_settings')
          .select('*')
          .eq('project_id', created.project_id)
          .limit(1),
      ),
    ])

    return summarizeSocialPosts(created ? [created] : [], [project], settings)[0]
  },

  async updateSocialPost(
    id: string,
    patch: Partial<SocialPostPatch>,
  ): Promise<SocialPost> {
    return unwrap<SocialPost>(
      requireSupabase()
        .from('social_posts')
        .update(patch)
        .eq('id', id)
        .select()
        .single(),
    )
  },

  async deleteSocialPost(id: string): Promise<void> {
    await ensure(requireSupabase().from('social_posts').delete().eq('id', id))
  },

  async listSponsorAdBatches(): Promise<SponsorAdBatchSummary[]> {
    const client = requireSupabase()
    const [batches, projects, settings] = await Promise.all([
      unwrap<SponsorAdBatch[]>(
        client
          .from('sponsor_ad_batches')
          .select('*')
          .order('created_at', { ascending: false }),
      ),
      unwrap<Project[]>(client.from('projects').select('*')),
      unwrap<ProjectSettings[]>(client.from('project_settings').select('*')),
    ])
    const posts =
      batches.length > 0
        ? await unwrap<SponsorAdPost[]>(
            client
              .from('sponsor_ad_posts')
              .select('*')
              .in(
                'batch_id',
                batches.map((batch) => batch.id),
              ),
          )
        : []

    return summarizeSponsorAdBatches(batches, projects, settings, posts)
  },

  async createSponsorAdBatch(
    patch: SponsorAdBatchPatch,
    posts: SponsorAdPostPatch[],
  ): Promise<SponsorAdBatchSummary> {
    validateSponsorAdBatchPatch(patch, posts)

    const client = requireSupabase()
    const created = await unwrap<SponsorAdBatch>(
      client
        .from('sponsor_ad_batches')
        .insert({
          ...patch,
          name: patch.name.trim(),
          ad_account_id: patch.ad_account_id.trim(),
          ad_account_name: patch.ad_account_name.trim(),
          source_id: patch.source_id.trim(),
          source_name: patch.source_name.trim(),
          campaign_id: patch.campaign_id.trim(),
          campaign_name: patch.campaign_name.trim(),
          adset_id: patch.adset_id.trim(),
          adset_name: patch.adset_name.trim(),
          rule_id: patch.rule_id.trim(),
          rule_name: patch.rule_name.trim(),
          ad_name_pattern: patch.ad_name_pattern.trim() || 'ADV - {platform} - {post}',
          status: 'ready',
        })
        .select()
        .single(),
    )

    try {
      await ensure(
        client.from('sponsor_ad_posts').insert(
          posts.map((post) => ({
            batch_id: created.id,
            platform: post.platform,
            source_post_id: post.source_post_id.trim(),
            source_label: post.source_label.trim(),
            post_text: post.post_text.trim(),
            permalink_url: post.permalink_url.trim(),
            thumbnail_url: post.thumbnail_url.trim(),
            published_at: post.published_at || null,
            ad_name: post.ad_name.trim(),
          })),
        ),
      )
    } catch (postError) {
      await ensure(client.from('sponsor_ad_batches').delete().eq('id', created.id))
      throw postError
    }

    const [project, settings, createdPosts] = await Promise.all([
      unwrap<Project>(
        client.from('projects').select('*').eq('id', created.project_id).single(),
      ),
      unwrap<ProjectSettings[]>(
        client
          .from('project_settings')
          .select('*')
          .eq('project_id', created.project_id)
          .limit(1),
      ),
      unwrap<SponsorAdPost[]>(
        client.from('sponsor_ad_posts').select('*').eq('batch_id', created.id),
      ),
    ])

    return summarizeSponsorAdBatches(
      [created],
      [project],
      settings,
      createdPosts,
    )[0]
  },

  async updateSponsorAdBatchStatus(
    batchId: string,
    status: SponsorAdBatchStatus,
  ): Promise<SponsorAdBatch> {
    return unwrap<SponsorAdBatch>(
      requireSupabase()
        .from('sponsor_ad_batches')
        .update({ status })
        .eq('id', batchId)
        .select()
        .single(),
    )
  },

  async deleteSponsorAdBatch(batchId: string): Promise<void> {
    await ensure(requireSupabase().from('sponsor_ad_batches').delete().eq('id', batchId))
  },
}

const localRepository = {
  async listProjects(): Promise<ProjectSummary[]> {
    const db = readDb()

    return byNewest(db.projects).map((project) => ({
      ...project,
      open_tasks: db.tasks.filter(
        (task) => task.project_id === project.id && task.status === 'todo',
      ).length,
    }))
  },

  async createProject(name: string): Promise<Project> {
    const db = readDb()
    const project = { id: id(), name, created_at: now() }
    db.projects.unshift(project)
    db.project_settings.unshift(defaultProjectSettings(project.id))
    writeDb(db)

    return project
  },

  async updateProject(projectId: string, patch: ProjectPatch): Promise<Project> {
    const db = readDb()
    const project = db.projects.find((item) => item.id === projectId)

    if (!project) {
      throw new Error('Progetto non trovato')
    }

    Object.assign(project, patch)
    writeDb(db)

    return project
  },

  async deleteProject(projectId: string): Promise<void> {
    const db = readDb()
    db.projects = db.projects.filter((project) => project.id !== projectId)
    db.events = db.events.filter((event) => event.project_id !== projectId)
    db.tasks = db.tasks.filter((task) => task.project_id !== projectId)
    db.notes = db.notes.filter((note) => note.project_id !== projectId)
    db.links = db.links.filter((link) => link.project_id !== projectId)
    db.reminders = db.reminders.filter(
      (reminder) => reminder.project_id !== projectId,
    )
    db.project_settings = db.project_settings.filter(
      (settings) => settings.project_id !== projectId,
    )
    db.calendar_notes = db.calendar_notes.filter(
      (note) => note.project_id !== projectId,
    )
    db.social_posts = db.social_posts.filter(
      (post) => post.project_id !== projectId,
    )
    const batchIds = db.sponsor_ad_batches
      .filter((batch) => batch.project_id === projectId)
      .map((batch) => batch.id)
    db.sponsor_ad_batches = db.sponsor_ad_batches.filter(
      (batch) => batch.project_id !== projectId,
    )
    db.sponsor_ad_posts = db.sponsor_ad_posts.filter(
      (post) => !batchIds.includes(post.batch_id),
    )
    const requestIds = db.client_requests
      .filter((request) => request.project_id === projectId)
      .map((request) => request.id)
    db.request_links = db.request_links.filter(
      (link) => link.project_id !== projectId,
    )
    db.client_requests = db.client_requests.filter(
      (request) => request.project_id !== projectId,
    )
    db.client_request_files = db.client_request_files.filter(
      (file) => !requestIds.includes(file.client_request_id),
    )
    db.client_request_updates = db.client_request_updates.filter(
      (update) => !requestIds.includes(update.client_request_id),
    )
    db.notifications = db.notifications.filter(
      (notification) => notification.project_id !== projectId,
    )
    writeDb(db)
  },

  async getProjectBundle(projectId: string): Promise<ProjectBundle> {
    const db = readDb()
    const project = db.projects.find((item) => item.id === projectId)

    if (!project) {
      throw new Error('Progetto non trovato')
    }

    return {
      project,
      settings:
        db.project_settings.find((settings) => settings.project_id === projectId) ??
        null,
      events: byNewest(db.events.filter((event) => event.project_id === projectId)),
      tasks: db.tasks.filter((task) => task.project_id === projectId),
      note: db.notes.find((note) => note.project_id === projectId) ?? null,
      links: byNewest(db.links.filter((link) => link.project_id === projectId)),
      reminders: db.reminders.filter(
        (reminder) => reminder.project_id === projectId,
      ),
      social_posts: db.social_posts.filter((post) => post.project_id === projectId),
      sponsor_ad_batches: summarizeSponsorAdBatches(
        db.sponsor_ad_batches.filter((batch) => batch.project_id === projectId),
        db.projects,
        db.project_settings,
        db.sponsor_ad_posts,
      ),
      client_requests: summarizeClientRequests(
        db.client_requests.filter((request) => request.project_id === projectId),
        db.projects,
        db.client_request_files,
        db.client_request_updates,
      ),
    }
  },

  async saveProjectSettings(
    projectId: string,
    patch: ProjectSettingsPatch,
  ): Promise<ProjectSettings> {
    const db = readDb()
    const existing = db.project_settings.find(
      (settings) => settings.project_id === projectId,
    )
    const settings = {
      ...(existing ?? defaultProjectSettings(projectId)),
      ...patch,
      updated_at: now(),
    }

    if (existing) {
      Object.assign(existing, settings)
    } else {
      db.project_settings.unshift(settings)
    }

    writeDb(db)

    return settings
  },

  async uploadProjectLogo(_projectId: string, file: File): Promise<string> {
    validateLogoFile(file)

    return readFileAsDataUrl(file)
  },

  async getProjectRequestLink(projectId: string): Promise<ProjectRequestLink> {
    const db = readDb()
    const existing = db.request_links.find((link) => link.project_id === projectId)

    if (existing) {
      return existing
    }

    const link = {
      id: id(),
      project_id: projectId,
      token: id().replace(/-/g, ''),
      is_enabled: true,
      created_at: now(),
    }
    db.request_links.unshift(link)
    writeDb(db)

    return link
  },

  async listProjectClientRequests(
    projectId: string,
  ): Promise<ClientRequestSummary[]> {
    const db = readDb()

    return summarizeClientRequests(
      db.client_requests.filter((request) => request.project_id === projectId),
      db.projects,
      db.client_request_files,
      db.client_request_updates,
    )
  },

  async listClientRequests(): Promise<ClientRequestSummary[]> {
    const db = readDb()

    return summarizeClientRequests(
      db.client_requests,
      db.projects,
      db.client_request_files,
      db.client_request_updates,
    )
  },

  async updateClientRequestStatus(
    requestId: string,
    status: ClientRequestStatus,
  ): Promise<ClientRequest> {
    const db = readDb()
    const request = db.client_requests.find((item) => item.id === requestId)

    if (!request) {
      throw new Error('Richiesta non trovata')
    }

    request.status = status
    writeDb(db)

    return request
  },

  async createClientRequestUpdate(
    requestId: string,
    patch: ClientRequestUpdatePatch,
  ): Promise<ClientRequestUpdate> {
    validateClientRequestUpdatePatch(patch)

    const db = readDb()
    const request = db.client_requests.find((item) => item.id === requestId)

    if (!request) {
      throw new Error('Richiesta non trovata')
    }

    const fileUrl = patch.file ? await readFileAsDataUrl(patch.file) : null
    const update = {
      id: id(),
      client_request_id: requestId,
      user_id: 'local-user',
      text: patch.text.trim(),
      file_name: patch.file?.name ?? null,
      file_url: fileUrl,
      file_path: patch.file
        ? `local/internal/${requestId}/${safeFileName(patch.file.name)}`
        : null,
      file_size: patch.file?.size ?? null,
      mime_type: patch.file?.type ?? null,
      created_at: now(),
    }
    db.client_request_updates.unshift(update)
    writeDb(db)

    return update
  },

  async getPublicRequestForm(token: string): Promise<PublicRequestForm> {
    const db = readDb()
    const link = db.request_links.find(
      (item) => item.token === token && item.is_enabled,
    )
    const project = link
      ? db.projects.find((item) => item.id === link.project_id)
      : null

    if (!link || !project) {
      throw new Error('Link richiesta non valido o disattivato')
    }

    return { project_name: project.name }
  },

  async submitPublicClientRequest(
    token: string,
    patch: ClientRequestPatch,
  ): Promise<ClientRequest> {
    validateClientRequestPatch(patch)

    const db = readDb()
    const link = db.request_links.find(
      (item) => item.token === token && item.is_enabled,
    )
    const project = link
      ? db.projects.find((item) => item.id === link.project_id)
      : null

    if (!link || !project) {
      throw new Error('Link richiesta non valido o disattivato')
    }

    const request = {
      id: id(),
      project_id: project.id,
      request_link_id: link.id,
      title: patch.title.trim(),
      request_type: patch.request_type,
      urgency: patch.urgency,
      description: patch.description.trim(),
      status: 'new' as const,
      created_at: now(),
    }
    db.client_requests.unshift(request)
    db.notifications.unshift({
      id: id(),
      user_id: project.user_id ?? 'local-user',
      project_id: project.id,
      title: `Nuova richiesta: ${request.title}`,
      text: `Urgenza ${request.urgency}/5 - ${request.request_type}`,
      status: 'unread',
      source_type: 'client_request',
      source_id: request.id,
      created_at: now(),
    })
    writeDb(db)

    return request
  },

  async uploadClientRequestFile(
    _token: string,
    requestId: string,
    file: File,
  ): Promise<ClientRequestFile> {
    validateRequestFile(file)

    const db = readDb()
    const fileUrl = await readFileAsDataUrl(file)
    const requestFile = {
      id: id(),
      client_request_id: requestId,
      file_name: file.name,
      file_url: fileUrl,
      file_path: `local/${requestId}/${safeFileName(file.name)}`,
      file_size: file.size,
      mime_type: file.type,
      created_at: now(),
    }
    db.client_request_files.unshift(requestFile)
    writeDb(db)

    return requestFile
  },

  async listNotifications(): Promise<AppNotification[]> {
    const db = readDb()

    return byNewest(db.notifications).slice(0, 20)
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    const db = readDb()
    const notification = db.notifications.find((item) => item.id === notificationId)

    if (notification) {
      notification.status = 'read'
      writeDb(db)
    }
  },

  async createEvent(projectId: string, text: string): Promise<ProjectEvent> {
    const db = readDb()
    const event = { id: id(), project_id: projectId, text, created_at: now() }
    db.events.unshift(event)
    writeDb(db)

    return event
  },

  async updateEvent(eventId: string, patch: EventPatch): Promise<ProjectEvent> {
    const db = readDb()
    const event = db.events.find((item) => item.id === eventId)

    if (!event) {
      throw new Error('Evento non trovato')
    }

    Object.assign(event, patch)
    writeDb(db)

    return event
  },

  async deleteEvent(eventId: string): Promise<void> {
    const db = readDb()
    db.events = db.events.filter((event) => event.id !== eventId)
    writeDb(db)
  },

  async createTask(
    projectId: string,
    title: string,
    dueDate: string | null,
  ): Promise<Task> {
    const db = readDb()
    const task = {
      id: id(),
      project_id: projectId,
      title,
      status: 'todo' as TaskStatus,
      due_date: dueDate,
      created_at: now(),
    }
    db.tasks.unshift(task)
    writeDb(db)

    return task
  },

  async updateTask(taskId: string, patch: TaskPatch): Promise<Task> {
    const db = readDb()
    const task = db.tasks.find((item) => item.id === taskId)

    if (!task) {
      throw new Error('Task non trovato')
    }

    Object.assign(task, patch)
    writeDb(db)

    return task
  },

  async deleteTask(taskId: string): Promise<void> {
    const db = readDb()
    db.tasks = db.tasks.filter((task) => task.id !== taskId)
    db.reminders = db.reminders.map((reminder) =>
      reminder.related_task_id === taskId
        ? { ...reminder, related_task_id: null }
        : reminder,
    )
    writeDb(db)
  },

  async saveNote(
    projectId: string,
    text: string,
    existingId?: string,
  ): Promise<Note> {
    const db = readDb()
    const existing = existingId
      ? db.notes.find((note) => note.id === existingId)
      : db.notes.find((note) => note.project_id === projectId)

    if (existing) {
      existing.text = text
      writeDb(db)

      return existing
    }

    const note = { id: id(), project_id: projectId, text, created_at: now() }
    db.notes.unshift(note)
    writeDb(db)

    return note
  },

  async deleteNote(noteId: string): Promise<void> {
    const db = readDb()
    db.notes = db.notes.filter((note) => note.id !== noteId)
    writeDb(db)
  },

  async createLink(
    projectId: string,
    label: string,
    url: string,
  ): Promise<ProjectLink> {
    const db = readDb()
    const link = {
      id: id(),
      project_id: projectId,
      label,
      url,
      created_at: now(),
    }
    db.links.unshift(link)
    writeDb(db)

    return link
  },

  async updateLink(linkId: string, patch: LinkPatch): Promise<ProjectLink> {
    const db = readDb()
    const link = db.links.find((item) => item.id === linkId)

    if (!link) {
      throw new Error('Link non trovato')
    }

    Object.assign(link, patch)
    writeDb(db)

    return link
  },

  async deleteLink(linkId: string): Promise<void> {
    const db = readDb()
    db.links = db.links.filter((link) => link.id !== linkId)
    writeDb(db)
  },

  async createReminder(
    projectId: string,
    text: string,
    remindAt: string,
    relatedTaskId: string | null,
  ): Promise<Reminder> {
    const db = readDb()
    const reminder = {
      id: id(),
      project_id: projectId,
      text,
      remind_at: remindAt,
      status: 'pending' as ReminderStatus,
      related_task_id: relatedTaskId,
      created_at: now(),
    }
    db.reminders.unshift(reminder)
    writeDb(db)

    return reminder
  },

  async updateReminder(
    reminderId: string,
    patch: ReminderPatch,
  ): Promise<Reminder> {
    const db = readDb()
    const reminder = db.reminders.find((item) => item.id === reminderId)

    if (!reminder) {
      throw new Error('Promemoria non trovato')
    }

    Object.assign(reminder, patch)
    writeDb(db)

    return reminder
  },

  async deleteReminder(reminderId: string): Promise<void> {
    const db = readDb()
    db.reminders = db.reminders.filter((reminder) => reminder.id !== reminderId)
    writeDb(db)
  },

  async listCalendarNotes(): Promise<CalendarNoteSummary[]> {
    const db = readDb()

    return summarizeCalendarNotes(
      db.calendar_notes,
      db.projects,
      db.project_settings,
    )
  },

  async createCalendarNote(
    patch: CalendarNotePatch,
  ): Promise<CalendarNoteSummary> {
    const db = readDb()
    const note = {
      id: id(),
      ...patch,
      label: patch.label || 'FEED',
      color: patch.color || '#2f8f56',
      created_at: now(),
    }
    db.calendar_notes.unshift(note)
    writeDb(db)

    return summarizeCalendarNotes(
      [note],
      db.projects,
      db.project_settings,
    )[0]
  },

  async deleteCalendarNote(noteId: string): Promise<void> {
    const db = readDb()
    db.calendar_notes = db.calendar_notes.filter((note) => note.id !== noteId)
    writeDb(db)
  },

  async listSocialPosts(): Promise<SocialPostSummary[]> {
    const db = readDb()

    return summarizeSocialPosts(db.social_posts, db.projects, db.project_settings)
  },

  async createSocialPost(patch: SocialPostPatch): Promise<SocialPostSummary> {
    const db = readDb()
    const post = {
      id: id(),
      ...patch,
      error_message: null,
      created_at: now(),
      updated_at: now(),
    }
    db.social_posts.unshift(post)
    writeDb(db)

    return summarizeSocialPosts([post], db.projects, db.project_settings)[0]
  },

  async updateSocialPost(
    postId: string,
    patch: Partial<SocialPostPatch>,
  ): Promise<SocialPost> {
    const db = readDb()
    const post = db.social_posts.find((item) => item.id === postId)

    if (!post) {
      throw new Error('Post non trovato')
    }

    Object.assign(post, patch, { updated_at: now() })
    writeDb(db)

    return post
  },

  async deleteSocialPost(postId: string): Promise<void> {
    const db = readDb()
    db.social_posts = db.social_posts.filter((post) => post.id !== postId)
    writeDb(db)
  },

  async listSponsorAdBatches(): Promise<SponsorAdBatchSummary[]> {
    const db = readDb()

    return summarizeSponsorAdBatches(
      db.sponsor_ad_batches,
      db.projects,
      db.project_settings,
      db.sponsor_ad_posts,
    )
  },

  async createSponsorAdBatch(
    patch: SponsorAdBatchPatch,
    posts: SponsorAdPostPatch[],
  ): Promise<SponsorAdBatchSummary> {
    validateSponsorAdBatchPatch(patch, posts)

    const db = readDb()
    const batch: SponsorAdBatch = {
      id: id(),
      project_id: patch.project_id,
      name: patch.name.trim(),
      ad_account_id: patch.ad_account_id.trim(),
      ad_account_name: patch.ad_account_name.trim(),
      source_id: patch.source_id.trim(),
      source_name: patch.source_name.trim(),
      campaign_id: patch.campaign_id.trim(),
      campaign_name: patch.campaign_name.trim(),
      adset_id: patch.adset_id.trim(),
      adset_name: patch.adset_name.trim(),
      rule_id: patch.rule_id.trim(),
      rule_name: patch.rule_name.trim(),
      ad_name_pattern: patch.ad_name_pattern.trim() || 'ADV - {platform} - {post}',
      create_active: patch.create_active,
      status: 'ready',
      created_at: now(),
      updated_at: now(),
    }
    const createdPosts: SponsorAdPost[] = posts.map((post) => ({
      id: id(),
      batch_id: batch.id,
      platform: post.platform,
      source_post_id: post.source_post_id.trim(),
      source_label: post.source_label.trim(),
      post_text: post.post_text.trim(),
      permalink_url: post.permalink_url.trim(),
      thumbnail_url: post.thumbnail_url.trim(),
      published_at: post.published_at || null,
      ad_name: post.ad_name.trim(),
      status: 'queued',
      created_at: now(),
    }))

    db.sponsor_ad_batches.unshift(batch)
    db.sponsor_ad_posts.unshift(...createdPosts)
    writeDb(db)

    return summarizeSponsorAdBatches(
      [batch],
      db.projects,
      db.project_settings,
      createdPosts,
    )[0]
  },

  async updateSponsorAdBatchStatus(
    batchId: string,
    status: SponsorAdBatchStatus,
  ): Promise<SponsorAdBatch> {
    const db = readDb()
    const batch = db.sponsor_ad_batches.find((item) => item.id === batchId)

    if (!batch) {
      throw new Error('Batch Ads non trovato')
    }

    batch.status = status
    batch.updated_at = now()
    writeDb(db)

    return batch
  },

  async deleteSponsorAdBatch(batchId: string): Promise<void> {
    const db = readDb()
    db.sponsor_ad_batches = db.sponsor_ad_batches.filter(
      (batch) => batch.id !== batchId,
    )
    db.sponsor_ad_posts = db.sponsor_ad_posts.filter(
      (post) => post.batch_id !== batchId,
    )
    writeDb(db)
  },
}

export const repository = isSupabaseConfigured ? supabaseRepository : localRepository
export const dataMode = isSupabaseConfigured ? 'Supabase' : 'Demo locale'
