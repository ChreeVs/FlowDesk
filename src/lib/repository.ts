import { isSupabaseConfigured, supabase } from './supabase'
import type {
  Note,
  Project,
  ProjectBundle,
  ProjectEvent,
  ProjectLink,
  ProjectSummary,
  Reminder,
  ReminderStatus,
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

type LocalDb = {
  projects: Project[]
  events: ProjectEvent[]
  tasks: Task[]
  notes: Note[]
  links: ProjectLink[]
  reminders: Reminder[]
}

const LOCAL_KEY = 'flowdesk-local-db-v1'

const emptyDb = (): LocalDb => ({
  projects: [],
  events: [],
  tasks: [],
  notes: [],
  links: [],
  reminders: [],
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

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  return supabase
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
    return unwrap<Project>(
      requireSupabase()
        .from('projects')
        .insert({ name })
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
    const [project, events, tasks, notes, links, reminders] = await Promise.all([
      unwrap<Project>(
        client.from('projects').select('*').eq('id', projectId).single(),
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
    ])

    return {
      project,
      events,
      tasks,
      note: notes[0] ?? null,
      links,
      reminders,
    }
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
      events: byNewest(db.events.filter((event) => event.project_id === projectId)),
      tasks: db.tasks.filter((task) => task.project_id === projectId),
      note: db.notes.find((note) => note.project_id === projectId) ?? null,
      links: byNewest(db.links.filter((link) => link.project_id === projectId)),
      reminders: db.reminders.filter(
        (reminder) => reminder.project_id === projectId,
      ),
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
}

export const repository = isSupabaseConfigured ? supabaseRepository : localRepository
export const dataMode = isSupabaseConfigured ? 'Supabase' : 'Demo locale'
