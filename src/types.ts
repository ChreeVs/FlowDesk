export type TaskStatus = 'todo' | 'done'
export type ReminderStatus = 'pending' | 'done'
export type SocialPlatform = 'facebook' | 'instagram'
export type SocialPostStatus = 'draft' | 'scheduled' | 'published' | 'failed'
export type AdsPlatform = 'facebook' | 'instagram'
export type SponsorAdBatchStatus = 'draft' | 'ready' | 'exported' | 'launched'
export type SponsorAdPostStatus = 'queued' | 'created' | 'failed'
export type ClientRequestType =
  | 'modifica'
  | 'nuovo_lavoro'
  | 'bug'
  | 'contenuto'
  | 'grafica'
  | 'altro'
export type ClientRequestStatus =
  | 'new'
  | 'pending'
  | 'completed'
  | 'rejected'
  | 'reviewed'
  | 'done'
  | 'archived'
export type NotificationStatus = 'unread' | 'read'

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
  title: string
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

export type SponsorAdBatch = {
  id: string
  project_id: string
  name: string
  ad_account_id: string
  ad_account_name: string
  source_id: string
  source_name: string
  campaign_id: string
  campaign_name: string
  adset_id: string
  adset_name: string
  rule_id: string
  rule_name: string
  ad_name_pattern: string
  create_active: boolean
  status: SponsorAdBatchStatus
  created_at: string
  updated_at: string
}

export type SponsorAdPost = {
  id: string
  batch_id: string
  platform: AdsPlatform
  source_post_id: string
  source_label: string
  post_text: string
  permalink_url: string
  thumbnail_url: string
  published_at: string | null
  ad_name: string
  status: SponsorAdPostStatus
  created_at: string
}

export type SponsorAdBatchSummary = SponsorAdBatch & {
  project_name: string
  project_color: string
  posts: SponsorAdPost[]
}

export type ProjectRequestLink = {
  id: string
  project_id: string
  token: string
  is_enabled: boolean
  created_at: string
}

export type ClientRequestFile = {
  id: string
  client_request_id: string
  file_name: string
  file_url: string
  file_path: string
  file_size: number
  mime_type: string
  created_at: string
}

export type ClientRequestUpdate = {
  id: string
  client_request_id: string
  user_id: string | null
  text: string
  file_name: string | null
  file_url: string | null
  file_path: string | null
  file_size: number | null
  mime_type: string | null
  created_at: string
}

export type ClientRequest = {
  id: string
  project_id: string
  request_link_id: string | null
  title: string
  request_type: ClientRequestType
  urgency: number
  description: string
  status: ClientRequestStatus
  created_at: string
}

export type ClientRequestSummary = ClientRequest & {
  project_name: string
  files: ClientRequestFile[]
  updates: ClientRequestUpdate[]
}

export type PublicRequestForm = {
  project_name: string
}

export type AppNotification = {
  id: string
  user_id: string
  project_id: string | null
  title: string
  text: string
  status: NotificationStatus
  source_type: string | null
  source_id: string | null
  created_at: string
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
  sponsor_ad_batches: SponsorAdBatchSummary[]
  client_requests: ClientRequestSummary[]
}

export type TaskFilter = 'all' | 'todo' | 'done'
