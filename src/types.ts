export type TaskStatus = 'todo' | 'done'
export type ReminderStatus = 'pending' | 'done'
export type SocialPlatform = 'facebook' | 'instagram'
export type SocialPostStatus = 'draft' | 'scheduled' | 'published' | 'failed'

export type Project = {
  id: string
  user_id?: string | null
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

export type ProjectSettings = {
  project_id: string
  logo_url: string | null
  color: string
  description: string
  website_url: string
  facebook_url: string
  instagram_url: string
  linkedin_url: string
  x_url: string
  youtube_url: string
  drive_url: string
  updated_at: string
}

export type CalendarNote = {
  id: string
  project_id: string
  text: string
  label: string
  color: string
  scheduled_at: string
  created_at: string
}

export type CalendarNoteSummary = CalendarNote & {
  project_name: string
  project_color: string
}

export type SocialPost = {
  id: string
  project_id: string
  text: string
  media_url: string
  platforms: SocialPlatform[]
  status: SocialPostStatus
  scheduled_at: string
  error_message: string | null
  created_at: string
  updated_at: string
}

export type SocialPostSummary = SocialPost & {
  project_name: string
  project_color: string
}

export type ProjectBundle = {
  project: Project
  settings: ProjectSettings | null
  events: ProjectEvent[]
  tasks: Task[]
  note: Note | null
  links: ProjectLink[]
  reminders: Reminder[]
  social_posts: SocialPost[]
}

export type TaskFilter = 'all' | 'todo' | 'done'
