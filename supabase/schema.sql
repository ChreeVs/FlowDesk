create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
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

create index if not exists events_project_created_idx
  on public.events(project_id, created_at desc);

create index if not exists tasks_project_status_due_idx
  on public.tasks(project_id, status, due_date);

create index if not exists links_project_created_idx
  on public.links(project_id, created_at desc);

create index if not exists reminders_project_status_time_idx
  on public.reminders(project_id, status, remind_at);

alter table public.projects enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.links enable row level security;
alter table public.reminders enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.projects to anon, authenticated;
grant select, insert, update, delete on public.events to anon, authenticated;
grant select, insert, update, delete on public.tasks to anon, authenticated;
grant select, insert, update, delete on public.notes to anon, authenticated;
grant select, insert, update, delete on public.links to anon, authenticated;
grant select, insert, update, delete on public.reminders to anon, authenticated;

drop policy if exists "single_user_all_projects" on public.projects;
create policy "single_user_all_projects"
  on public.projects
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "single_user_all_events" on public.events;
create policy "single_user_all_events"
  on public.events
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "single_user_all_tasks" on public.tasks;
create policy "single_user_all_tasks"
  on public.tasks
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "single_user_all_notes" on public.notes;
create policy "single_user_all_notes"
  on public.notes
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "single_user_all_links" on public.links;
create policy "single_user_all_links"
  on public.links
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "single_user_all_reminders" on public.reminders;
create policy "single_user_all_reminders"
  on public.reminders
  for all
  to anon, authenticated
  using (true)
  with check (true);
