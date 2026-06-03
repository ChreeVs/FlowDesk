import { isSupabaseConfigured, supabase } from './supabase'
import type {
  CalendarNote,
  CalendarNoteSummary,
  Note,
  Project,
  ProjectBundle,
  ProjectEvent,
  ProjectLink,
  ProjectSettings,
  ProjectSummary,
  Reminder,
  ReminderStatus,
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
type CalendarNotePatch = Pick<CalendarNote, 'project_id' | 'text' | 'scheduled_at'>
type SocialPostPatch = Pick<
  SocialPost,
  'project_id' | 'text' | 'media_url' | 'platforms' | 'status' | 'scheduled_at'
>

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
})

const now = () => new Date().toISOString()
const id = () => crypto.randomUUID()

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
      project_name: project?.name ?? 'Progetto',
      project_color: projectSettings?.color ?? '#6b58d6',
    }
  })

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

    return {
      project,
      settings: settings[0] ?? null,
      events,
      tasks,
      note: notes[0] ?? null,
      links,
      reminders,
      social_posts: socialPosts,
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
}

export const repository = isSupabaseConfigured ? supabaseRepository : localRepository
export const dataMode = isSupabaseConfigured ? 'Supabase' : 'Demo locale'
