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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

create index if not exists meta_oauth_states_user_created_idx
  on public.meta_oauth_states(user_id, created_at desc);

create index if not exists meta_connections_user_kind_idx
  on public.meta_connections(user_id, app_kind);

create index if not exists meta_pages_user_connection_idx
  on public.meta_pages(user_id, connection_id);

create index if not exists meta_instagram_user_connection_idx
  on public.meta_instagram_accounts(user_id, connection_id);

alter table public.meta_oauth_states enable row level security;
alter table public.meta_connections enable row level security;
alter table public.meta_pages enable row level security;
alter table public.meta_instagram_accounts enable row level security;

alter table public.meta_oauth_states force row level security;
alter table public.meta_connections force row level security;
alter table public.meta_pages force row level security;
alter table public.meta_instagram_accounts force row level security;

revoke all on public.meta_oauth_states from anon, authenticated;
revoke all on public.meta_connections from anon, authenticated;
revoke all on public.meta_pages from anon, authenticated;
revoke all on public.meta_instagram_accounts from anon, authenticated;

notify pgrst, 'reload schema';
