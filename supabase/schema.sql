create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'done')),
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  url text not null,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  text text not null,
  remind_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'done')),
  related_task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_settings (
  project_id uuid primary key references public.projects(id) on delete cascade,
  logo_url text,
  color text not null default '#6b58d6',
  description text not null default '',
  website_url text not null default '',
  facebook_url text not null default '',
  instagram_url text not null default '',
  linkedin_url text not null default '',
  x_url text not null default '',
  youtube_url text not null default '',
  drive_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null default 'Nota',
  text text not null,
  label text not null default 'FEED',
  color text not null default '#2f8f56',
  scheduled_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.request_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  request_link_id uuid references public.request_links(id) on delete set null,
  title text not null,
  request_type text not null default 'modifica'
    check (request_type in ('modifica', 'nuovo_lavoro', 'bug', 'contenuto', 'grafica', 'altro')),
  urgency smallint not null default 0 check (urgency between 0 and 5),
  description text not null default '',
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'done', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.client_request_files (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null references public.client_requests(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_path text not null,
  file_size integer not null check (file_size <= 10485760),
  mime_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.client_request_updates (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null references public.client_requests(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  text text not null default '',
  file_name text,
  file_url text,
  file_path text,
  file_size integer check (file_size is null or file_size <= 10485760),
  mime_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  text text not null default '',
  status text not null default 'unread' check (status in ('unread', 'read')),
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  text text not null,
  media_url text not null default '',
  platforms text[] not null default '{}'::text[]
    check (platforms <@ array['facebook', 'instagram']::text[]),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'failed')),
  scheduled_at timestamptz not null,
  facebook_post_id text,
  instagram_media_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meta_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  app_kind text not null default 'social' check (app_kind in ('social', 'ads')),
  return_to text not null default '',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.meta_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_kind text not null default 'social' check (app_kind in ('social', 'ads')),
  provider text not null default 'facebook',
  meta_user_id text not null default '',
  meta_user_name text not null default '',
  access_token text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}'::text[],
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, app_kind, provider)
);

create table if not exists public.meta_pages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.meta_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id text not null,
  page_name text not null default '',
  page_access_token text not null default '',
  instagram_business_account_id text not null default '',
  instagram_username text not null default '',
  instagram_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, page_id)
);

create table if not exists public.meta_instagram_accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.meta_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  instagram_user_id text not null,
  username text not null default '',
  name text not null default '',
  page_id text not null default '',
  page_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, instagram_user_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'solo', 'studio')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.calendar_notes
  add column if not exists title text not null default 'Nota';

alter table public.calendar_notes
  add column if not exists label text not null default 'FEED';

alter table public.calendar_notes
  add column if not exists color text not null default '#2f8f56';

alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

alter table public.client_requests
  drop constraint if exists client_requests_status_check;

alter table public.client_requests
  add constraint client_requests_status_check
  check (status in ('new', 'pending', 'completed', 'rejected', 'reviewed', 'done', 'archived'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-files',
  'request-files',
  true,
  10485760,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'application/zip',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

drop trigger if exists project_settings_set_updated_at on public.project_settings;
create trigger project_settings_set_updated_at
  before update on public.project_settings
  for each row
  execute function public.set_updated_at();

drop trigger if exists social_posts_set_updated_at on public.social_posts;
create trigger social_posts_set_updated_at
  before update on public.social_posts
  for each row
  execute function public.set_updated_at();

drop trigger if exists meta_connections_set_updated_at on public.meta_connections;
create trigger meta_connections_set_updated_at
  before update on public.meta_connections
  for each row
  execute function public.set_updated_at();

drop trigger if exists meta_pages_set_updated_at on public.meta_pages;
create trigger meta_pages_set_updated_at
  before update on public.meta_pages
  for each row
  execute function public.set_updated_at();

drop trigger if exists meta_instagram_accounts_set_updated_at on public.meta_instagram_accounts;
create trigger meta_instagram_accounts_set_updated_at
  before update on public.meta_instagram_accounts
  for each row
  execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.subscriptions(user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

insert into public.profiles(id, display_name)
select
  users.id,
  coalesce(users.raw_user_meta_data->>'name', split_part(users.email, '@', 1))
from auth.users as users
on conflict (id) do nothing;

insert into public.subscriptions(user_id, plan, status)
select users.id, 'free', 'active'
from auth.users as users
on conflict (user_id) do nothing;

insert into public.project_settings(project_id)
select projects.id
from public.projects as projects
on conflict (project_id) do nothing;

create or replace function public.request_link_accepts_upload(link_token text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.request_links
    where token = link_token
      and is_enabled = true
  );
$$;

create or replace function public.get_public_request_link(link_token text)
returns table(project_name text)
language sql
security definer
set search_path = public
as $$
  select projects.name
  from public.request_links
  join public.projects on projects.id = request_links.project_id
  where request_links.token = link_token
    and request_links.is_enabled = true
  limit 1;
$$;

create or replace function public.submit_public_client_request(
  link_token text,
  request_title text,
  request_type_value text,
  request_urgency integer,
  request_description text default ''
)
returns setof public.client_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target_link public.request_links%rowtype;
  target_project public.projects%rowtype;
  inserted_request public.client_requests%rowtype;
begin
  if length(trim(coalesce(request_title, ''))) = 0 then
    raise exception 'Nome richiesta obbligatorio';
  end if;

  if request_type_value not in ('modifica', 'nuovo_lavoro', 'bug', 'contenuto', 'grafica', 'altro') then
    raise exception 'Tipo richiesta non valido';
  end if;

  if request_urgency < 0 or request_urgency > 5 then
    raise exception 'Urgenza non valida';
  end if;

  select *
  into target_link
  from public.request_links
  where token = link_token
    and is_enabled = true
  limit 1;

  if target_link.id is null then
    raise exception 'Link richiesta non valido o disattivato';
  end if;

  select *
  into target_project
  from public.projects
  where id = target_link.project_id
  limit 1;

  if target_project.id is null or target_project.user_id is null then
    raise exception 'Progetto non disponibile';
  end if;

  insert into public.client_requests(
    project_id,
    request_link_id,
    title,
    request_type,
    urgency,
    description
  )
  values (
    target_project.id,
    target_link.id,
    trim(request_title),
    request_type_value,
    request_urgency,
    trim(coalesce(request_description, ''))
  )
  returning * into inserted_request;

  insert into public.notifications(
    user_id,
    project_id,
    title,
    text,
    source_type,
    source_id
  )
  values (
    target_project.user_id,
    target_project.id,
    'Nuova richiesta: ' || inserted_request.title,
    'Urgenza ' || inserted_request.urgency || '/5 - ' || inserted_request.request_type,
    'client_request',
    inserted_request.id
  );

  return next inserted_request;
end;
$$;

create or replace function public.add_public_client_request_file(
  link_token text,
  request_id_value uuid,
  file_name_value text,
  file_url_value text,
  file_path_value text,
  file_size_value integer,
  mime_type_value text
)
returns setof public.client_request_files
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request public.client_requests%rowtype;
  inserted_file public.client_request_files%rowtype;
begin
  select client_requests.*
  into target_request
  from public.client_requests
  join public.request_links on request_links.id = client_requests.request_link_id
  where client_requests.id = request_id_value
    and request_links.token = link_token
    and request_links.is_enabled = true
  limit 1;

  if target_request.id is null then
    raise exception 'Richiesta non valida';
  end if;

  if file_size_value > 10485760 then
    raise exception 'Allegato troppo grande';
  end if;

  insert into public.client_request_files(
    client_request_id,
    file_name,
    file_url,
    file_path,
    file_size,
    mime_type
  )
  values (
    request_id_value,
    file_name_value,
    file_url_value,
    file_path_value,
    file_size_value,
    mime_type_value
  )
  returning * into inserted_file;

  return next inserted_file;
end;
$$;

grant execute on function public.request_link_accepts_upload(text) to anon, authenticated;
grant execute on function public.get_public_request_link(text) to anon, authenticated;
grant execute on function public.submit_public_client_request(text, text, text, integer, text) to anon, authenticated;
grant execute on function public.add_public_client_request_file(text, uuid, text, text, text, integer, text) to anon, authenticated;

create index if not exists projects_user_created_idx
  on public.projects(user_id, created_at desc);

create index if not exists subscriptions_user_status_idx
  on public.subscriptions(user_id, status);

create index if not exists events_project_created_idx
  on public.events(project_id, created_at desc);

create index if not exists tasks_project_status_due_idx
  on public.tasks(project_id, status, due_date);

create index if not exists links_project_created_idx
  on public.links(project_id, created_at desc);

create index if not exists reminders_project_status_time_idx
  on public.reminders(project_id, status, remind_at);

create index if not exists calendar_notes_project_time_idx
  on public.calendar_notes(project_id, scheduled_at);

create index if not exists request_links_project_idx
  on public.request_links(project_id);

create index if not exists request_links_token_idx
  on public.request_links(token);

create index if not exists client_requests_project_created_idx
  on public.client_requests(project_id, created_at desc);

create index if not exists client_request_files_request_idx
  on public.client_request_files(client_request_id, created_at desc);

create index if not exists client_request_updates_request_created_idx
  on public.client_request_updates(client_request_id, created_at desc);

create index if not exists notifications_user_status_created_idx
  on public.notifications(user_id, status, created_at desc);

create index if not exists social_posts_project_time_idx
  on public.social_posts(project_id, scheduled_at);

create index if not exists social_posts_status_time_idx
  on public.social_posts(status, scheduled_at);

create index if not exists meta_oauth_states_user_created_idx
  on public.meta_oauth_states(user_id, created_at desc);

create index if not exists meta_connections_user_kind_idx
  on public.meta_connections(user_id, app_kind);

create index if not exists meta_pages_user_connection_idx
  on public.meta_pages(user_id, connection_id);

create index if not exists meta_instagram_user_connection_idx
  on public.meta_instagram_accounts(user_id, connection_id);

alter table public.projects enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.links enable row level security;
alter table public.reminders enable row level security;
alter table public.project_settings enable row level security;
alter table public.calendar_notes enable row level security;
alter table public.request_links enable row level security;
alter table public.client_requests enable row level security;
alter table public.client_request_files enable row level security;
alter table public.client_request_updates enable row level security;
alter table public.notifications enable row level security;
alter table public.social_posts enable row level security;
alter table public.meta_oauth_states enable row level security;
alter table public.meta_connections enable row level security;
alter table public.meta_pages enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

alter table public.projects force row level security;
alter table public.events force row level security;
alter table public.tasks force row level security;
alter table public.notes force row level security;
alter table public.links force row level security;
alter table public.reminders force row level security;
alter table public.project_settings force row level security;
alter table public.calendar_notes force row level security;
alter table public.request_links force row level security;
alter table public.client_requests force row level security;
alter table public.client_request_files force row level security;
alter table public.client_request_updates force row level security;
alter table public.notifications force row level security;
alter table public.social_posts force row level security;
alter table public.meta_oauth_states force row level security;
alter table public.meta_connections force row level security;
alter table public.meta_pages force row level security;
alter table public.profiles force row level security;
alter table public.subscriptions force row level security;

revoke all on public.projects from anon;
revoke all on public.events from anon;
revoke all on public.tasks from anon;
revoke all on public.notes from anon;
revoke all on public.links from anon;
revoke all on public.reminders from anon;
revoke all on public.project_settings from anon;
revoke all on public.calendar_notes from anon;
revoke all on public.request_links from anon;
revoke all on public.client_requests from anon;
revoke all on public.client_request_files from anon;
revoke all on public.client_request_updates from anon;
revoke all on public.notifications from anon;
revoke all on public.social_posts from anon;
revoke all on public.meta_oauth_states from anon;
revoke all on public.meta_connections from anon;
revoke all on public.meta_pages from anon;
revoke all on public.profiles from anon;
revoke all on public.subscriptions from anon;

revoke all on public.meta_oauth_states from authenticated;
revoke all on public.meta_connections from authenticated;
revoke all on public.meta_pages from authenticated;
revoke all on public.meta_instagram_accounts from authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.links to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
grant select, insert, update, delete on public.project_settings to authenticated;
grant select, insert, update, delete on public.calendar_notes to authenticated;
grant select, insert, update, delete on public.request_links to authenticated;
grant select, insert, update, delete on public.client_requests to authenticated;
grant select, insert, update, delete on public.client_request_files to authenticated;
grant select, insert, update, delete on public.client_request_updates to authenticated;
grant select, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.social_posts to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.subscriptions to authenticated;

drop policy if exists "single_user_all_projects" on public.projects;
drop policy if exists "single_user_all_events" on public.events;
drop policy if exists "single_user_all_tasks" on public.tasks;
drop policy if exists "single_user_all_notes" on public.notes;
drop policy if exists "single_user_all_links" on public.links;
drop policy if exists "single_user_all_reminders" on public.reminders;
drop policy if exists "project_settings_owned_by_project_user" on public.project_settings;
drop policy if exists "calendar_notes_owned_by_project_user" on public.calendar_notes;
drop policy if exists "request_links_owned_by_project_user" on public.request_links;
drop policy if exists "client_requests_owned_by_project_user" on public.client_requests;
drop policy if exists "client_request_files_owned_by_project_user" on public.client_request_files;
drop policy if exists "client_request_updates_owned_by_project_user" on public.client_request_updates;
drop policy if exists "notifications_owned_by_user" on public.notifications;
drop policy if exists "profiles_owned_by_user" on public.profiles;
drop policy if exists "profiles_update_own_display_name" on public.profiles;
drop policy if exists "subscriptions_owned_by_user" on public.subscriptions;

drop policy if exists "project_assets_public_read" on storage.objects;
create policy "project_assets_public_read"
  on storage.objects
  for select
  using (bucket_id = 'project-assets');

drop policy if exists "project_assets_user_insert" on storage.objects;
create policy "project_assets_user_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "project_assets_user_update" on storage.objects;
create policy "project_assets_user_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "project_assets_user_delete" on storage.objects;
create policy "project_assets_user_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "request_files_public_read" on storage.objects;
create policy "request_files_public_read"
  on storage.objects
  for select
  using (bucket_id = 'request-files');

drop policy if exists "request_files_public_insert" on storage.objects;
create policy "request_files_public_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'request-files'
    and public.request_link_accepts_upload((storage.foldername(name))[1])
  );

drop policy if exists "request_files_user_insert" on storage.objects;
create policy "request_files_user_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'request-files'
    and (storage.foldername(name))[1] = 'internal'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists "projects_owned_by_user" on public.projects;
create policy "projects_owned_by_user"
  on public.projects
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "profiles_owned_by_user"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own_display_name"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "subscriptions_owned_by_user"
  on public.subscriptions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "events_owned_by_project_user" on public.events;
create policy "events_owned_by_project_user"
  on public.events
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = events.project_id
        and projects.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = events.project_id
        and projects.user_id = (select auth.uid())
    )
  );

drop policy if exists "tasks_owned_by_project_user" on public.tasks;
create policy "tasks_owned_by_project_user"
  on public.tasks
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = tasks.project_id
        and projects.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = tasks.project_id
        and projects.user_id = (select auth.uid())
    )
  );

drop policy if exists "notes_owned_by_project_user" on public.notes;
create policy "notes_owned_by_project_user"
  on public.notes
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = notes.project_id
        and projects.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = notes.project_id
        and projects.user_id = (select auth.uid())
    )
  );

drop policy if exists "links_owned_by_project_user" on public.links;
create policy "links_owned_by_project_user"
  on public.links
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = links.project_id
        and projects.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = links.project_id
        and projects.user_id = (select auth.uid())
    )
  );

drop policy if exists "project_settings_owned_by_project_user" on public.project_settings;
create policy "project_settings_owned_by_project_user"
  on public.project_settings
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = project_settings.project_id
        and projects.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = project_settings.project_id
        and projects.user_id = (select auth.uid())
    )
  );

drop policy if exists "calendar_notes_owned_by_project_user" on public.calendar_notes;
create policy "calendar_notes_owned_by_project_user"
  on public.calendar_notes
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = calendar_notes.project_id
        and projects.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = calendar_notes.project_id
        and projects.user_id = (select auth.uid())
    )
  );

drop policy if exists "request_links_owned_by_project_user" on public.request_links;
create policy "request_links_owned_by_project_user"
  on public.request_links
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = request_links.project_id
        and projects.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = request_links.project_id
        and projects.user_id = (select auth.uid())
    )
  );

drop policy if exists "client_requests_owned_by_project_user" on public.client_requests;
create policy "client_requests_owned_by_project_user"
  on public.client_requests
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = client_requests.project_id
        and projects.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = client_requests.project_id
        and projects.user_id = (select auth.uid())
    )
  );

drop policy if exists "client_request_files_owned_by_project_user" on public.client_request_files;
create policy "client_request_files_owned_by_project_user"
  on public.client_request_files
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.client_requests
      join public.projects on projects.id = client_requests.project_id
      where client_requests.id = client_request_files.client_request_id
        and projects.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.client_requests
      join public.projects on projects.id = client_requests.project_id
      where client_requests.id = client_request_files.client_request_id
        and projects.user_id = (select auth.uid())
    )
  );

drop policy if exists "client_request_updates_owned_by_project_user" on public.client_request_updates;
create policy "client_request_updates_owned_by_project_user"
  on public.client_request_updates
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.client_requests
      join public.projects on projects.id = client_requests.project_id
      where client_requests.id = client_request_updates.client_request_id
        and projects.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.client_requests
      join public.projects on projects.id = client_requests.project_id
      where client_requests.id = client_request_updates.client_request_id
        and projects.user_id = (select auth.uid())
    )
    and (
      client_request_updates.user_id is null
      or client_request_updates.user_id = (select auth.uid())
    )
  );

drop policy if exists "notifications_owned_by_user" on public.notifications;
create policy "notifications_owned_by_user"
  on public.notifications
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "social_posts_owned_by_project_user" on public.social_posts;
create policy "social_posts_owned_by_project_user"
  on public.social_posts
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = social_posts.project_id
        and projects.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = social_posts.project_id
        and projects.user_id = (select auth.uid())
    )
    and social_posts.platforms <@ array['facebook', 'instagram', 'linkedin', 'tiktok', 'twitter', 'youtube', 'pinterest']::text[]
  );

drop policy if exists "reminders_owned_by_project_user" on public.reminders;
create policy "reminders_owned_by_project_user"
  on public.reminders
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.projects
      where projects.id = reminders.project_id
        and projects.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.projects
      where projects.id = reminders.project_id
        and projects.user_id = (select auth.uid())
    )
    and (
      reminders.related_task_id is null
      or exists (
        select 1
        from public.tasks
        where tasks.id = reminders.related_task_id
          and tasks.project_id = reminders.project_id
      )
    )
  );

notify pgrst, 'reload schema';
