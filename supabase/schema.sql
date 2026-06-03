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

alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

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

alter table public.projects enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.links enable row level security;
alter table public.reminders enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

alter table public.projects force row level security;
alter table public.events force row level security;
alter table public.tasks force row level security;
alter table public.notes force row level security;
alter table public.links force row level security;
alter table public.reminders force row level security;
alter table public.profiles force row level security;
alter table public.subscriptions force row level security;

revoke all on public.projects from anon;
revoke all on public.events from anon;
revoke all on public.tasks from anon;
revoke all on public.notes from anon;
revoke all on public.links from anon;
revoke all on public.reminders from anon;
revoke all on public.profiles from anon;
revoke all on public.subscriptions from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.links to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.subscriptions to authenticated;

drop policy if exists "single_user_all_projects" on public.projects;
drop policy if exists "single_user_all_events" on public.events;
drop policy if exists "single_user_all_tasks" on public.tasks;
drop policy if exists "single_user_all_notes" on public.notes;
drop policy if exists "single_user_all_links" on public.links;
drop policy if exists "single_user_all_reminders" on public.reminders;
drop policy if exists "profiles_owned_by_user" on public.profiles;
drop policy if exists "profiles_update_own_display_name" on public.profiles;
drop policy if exists "subscriptions_owned_by_user" on public.subscriptions;

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
