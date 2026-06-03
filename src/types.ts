export type TaskStatus = 'todo' | 'done'
export type ReminderStatus = 'pending' | 'done'

export type Project = {
  id: string
  name: string
  created_at: string
}

export type ProjectSummary = Project & {
  open_tasks: number
}

export type ProjectEvent = {
  id: string
  project_id: string
  text: string
  created_at: string
}

export type Task = {
  id: string
  project_id: string
  title: string
  status: TaskStatus
  due_date: string | null
  created_at: string
}

export type Note = {
  id: string
  project_id: string
  text: string
  created_at: string
}

export type ProjectLink = {
  id: string
  project_id: string
  url: string
  label: string
  created_at: string
}

export type Reminder = {
  id: string
  project_id: string
  text: string
  remind_at: string
  status: ReminderStatus
  related_task_id: string | null
  created_at: string
}

export type ProjectBundle = {
  project: Project
  events: ProjectEvent[]
  tasks: Task[]
  note: Note | null
  links: ProjectLink[]
  reminders: Reminder[]
}

export type TaskFilter = 'all' | 'todo' | 'done'
