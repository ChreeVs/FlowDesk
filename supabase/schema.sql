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

alter table public.projects
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists projects_user_created_idx
  on public.projects(user_id, created_at desc);

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

alter table public.projects force row level security;
alter table public.events force row level security;
alter table public.tasks force row level security;
alter table public.notes force row level security;
alter table public.links force row level security;
alter table public.reminders force row level security;

revoke all on public.projects from anon;
revoke all on public.events from anon;
revoke all on public.tasks from anon;
revoke all on public.notes from anon;
revoke all on public.links from anon;
revoke all on public.reminders from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.links to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;

drop policy if exists "single_user_all_projects" on public.projects;
drop policy if exists "single_user_all_events" on public.events;
drop policy if exists "single_user_all_tasks" on public.tasks;
drop policy if exists "single_user_all_notes" on public.notes;
drop policy if exists "single_user_all_links" on public.links;
drop policy if exists "single_user_all_reminders" on public.reminders;

drop policy if exists "projects_owned_by_user" on public.projects;
create policy "projects_owned_by_user"
  on public.projects
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

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
