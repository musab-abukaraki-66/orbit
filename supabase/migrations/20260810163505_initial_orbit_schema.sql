-- =====================================================================
-- Orbit — M2: initial multi-tenant schema
--
-- Users are stored in auth.users (Supabase Auth); app tables reference it.
-- Tenant hierarchy: teams -> workspaces -> boards -> columns -> tasks
-- Memberships: team_memberships + workspace_memberships (owner/admin/member)
--
-- Row Level Security is enabled on every tenant-owned table. Policies use
-- SECURITY DEFINER helper functions in the `private` schema so membership
-- checks don't trigger recursive RLS evaluation.
-- =====================================================================

-- ---------------------------------------------------------------------
-- private schema + shared trigger helpers
-- ---------------------------------------------------------------------

create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------

create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.team_memberships (
  team_id    uuid not null references public.teams (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'member'
             check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  name       text not null,
  slug       text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, slug)
);

create table public.workspace_memberships (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'member'
               check (role in ('owner', 'admin', 'member')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.boards (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.columns (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards (id) on delete cascade,
  name       text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  column_id   uuid not null references public.columns (id) on delete cascade,
  title       text not null,
  description text,
  priority    text not null default 'medium'
              check (priority in ('low', 'medium', 'high', 'urgent')),
  status      text not null default 'todo'
              check (status in ('todo', 'in_progress', 'done')),
  position    integer not null default 0,
  assignee_id uuid references auth.users (id) on delete set null,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- indexes (foreign keys + common lookups)
-- ---------------------------------------------------------------------

create index teams_name_idx on public.teams (name);

create index team_memberships_user_id_idx on public.team_memberships (user_id);
create index team_memberships_role_idx on public.team_memberships (role);

create index workspaces_team_id_idx on public.workspaces (team_id);

create index workspace_memberships_user_id_idx on public.workspace_memberships (user_id);
create index workspace_memberships_role_idx on public.workspace_memberships (role);

create index boards_workspace_id_idx on public.boards (workspace_id);

create index columns_board_id_idx on public.columns (board_id);

create index tasks_column_id_idx on public.tasks (column_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);
create index tasks_created_by_idx on public.tasks (created_by);
create index tasks_status_idx on public.tasks (status);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function private.set_updated_at();

create trigger team_memberships_set_updated_at
  before update on public.team_memberships
  for each row execute function private.set_updated_at();

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function private.set_updated_at();

create trigger workspace_memberships_set_updated_at
  before update on public.workspace_memberships
  for each row execute function private.set_updated_at();

create trigger boards_set_updated_at
  before update on public.boards
  for each row execute function private.set_updated_at();

create trigger columns_set_updated_at
  before update on public.columns
  for each row execute function private.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- SECURITY DEFINER helper functions (avoid recursive RLS)
-- ---------------------------------------------------------------------

-- Resolve the parent team of a workspace.
create or replace function private.get_workspace_team_id(p_workspace_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select team_id
  from public.workspaces
  where id = p_workspace_id
$$;

-- Resolve the parent workspace of a board.
create or replace function private.get_board_workspace_id(p_board_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select workspace_id
  from public.boards
  where id = p_board_id
$$;

-- Resolve the parent board of a column.
create or replace function private.get_column_board_id(p_column_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select board_id
  from public.columns
  where id = p_column_id
$$;

-- Is the current user a member of the given team?
create or replace function private.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_memberships
    where team_id = p_team_id
      and user_id = (select auth.uid())
  )
$$;

-- Role of the current user in the given team (null if not a member).
create or replace function private.get_team_role(p_team_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.team_memberships
  where team_id = p_team_id
    and user_id = (select auth.uid())
  limit 1
$$;

-- Is the current user an owner or admin of the given team?
create or replace function private.is_team_admin(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.get_team_role(p_team_id) in ('owner', 'admin'), false)
$$;

-- Is the current user the owner of the given team?
create or replace function private.is_team_owner(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.get_team_role(p_team_id) = 'owner', false)
$$;

-- Is the current user a member of the given workspace?
create or replace function private.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships
    where workspace_id = p_workspace_id
      and user_id = (select auth.uid())
  )
$$;

-- Role of the current user in the given workspace (null if not a member).
create or replace function private.get_workspace_role(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.workspace_memberships
  where workspace_id = p_workspace_id
    and user_id = (select auth.uid())
  limit 1
$$;

-- Is the current user an owner or admin of the given workspace?
create or replace function private.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.get_workspace_role(p_workspace_id) in ('owner', 'admin'), false)
$$;

-- Is the current user the owner of the given workspace?
create or replace function private.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.get_workspace_role(p_workspace_id) = 'owner', false)
$$;

-- ---------------------------------------------------------------------
-- SECURITY DEFINER creation triggers
-- ---------------------------------------------------------------------

-- After a team is created the creator becomes its owner. Skipped when the
-- insert does not originate from an authenticated request (e.g. seeding).
create or replace function private.set_team_creator_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  v_uid := (select auth.uid());
  if v_uid is not null then
    insert into public.team_memberships (team_id, user_id, role)
    values (new.id, v_uid, 'owner');
  end if;
  return new;
end;
$$;

create trigger teams_after_insert_set_owner
  after insert on public.teams
  for each row execute function private.set_team_creator_owner();

-- After a workspace is created the creator becomes its owner.
create or replace function private.set_workspace_creator_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  v_uid := (select auth.uid());
  if v_uid is not null then
    insert into public.workspace_memberships (workspace_id, user_id, role)
    values (new.id, v_uid, 'owner');
  end if;
  return new;
end;
$$;

create trigger workspaces_after_insert_set_owner
  after insert on public.workspaces
  for each row execute function private.set_workspace_creator_owner();

-- Default tasks.created_by to the current user.
create or replace function private.set_task_created_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is null then
    new.created_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger tasks_before_insert_set_created_by
  before insert on public.tasks
  for each row execute function private.set_task_created_by();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.teams                   enable row level security;
alter table public.team_memberships        enable row level security;
alter table public.workspaces              enable row level security;
alter table public.workspace_memberships   enable row level security;
alter table public.boards                  enable row level security;
alter table public.columns                 enable row level security;
alter table public.tasks                   enable row level security;

-- ---- teams -----------------------------------------------------------

create policy "teams_select" on public.teams
  for select to authenticated
  using (private.is_team_member(id));

create policy "teams_insert" on public.teams
  for insert to authenticated
  with check ((select auth.uid()) is not null);

create policy "teams_update" on public.teams
  for update to authenticated
  using (private.is_team_admin(id))
  with check (private.is_team_admin(id));

create policy "teams_delete" on public.teams
  for delete to authenticated
  using (private.is_team_owner(id));

-- ---- team_memberships ------------------------------------------------

create policy "team_memberships_select" on public.team_memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_team_admin(team_id)
  );

create policy "team_memberships_insert" on public.team_memberships
  for insert to authenticated
  with check (private.is_team_admin(team_id));

create policy "team_memberships_update" on public.team_memberships
  for update to authenticated
  using (private.is_team_admin(team_id))
  with check (private.is_team_admin(team_id));

create policy "team_memberships_delete" on public.team_memberships
  for delete to authenticated
  using (private.is_team_admin(team_id));

-- ---- workspaces ------------------------------------------------------

create policy "workspaces_select" on public.workspaces
  for select to authenticated
  using (private.is_team_member(team_id));

create policy "workspaces_insert" on public.workspaces
  for insert to authenticated
  with check (private.is_team_member(team_id));

create policy "workspaces_update" on public.workspaces
  for update to authenticated
  using (private.is_workspace_admin(id) or private.is_team_admin(team_id))
  with check (
    (private.is_workspace_admin(id) or private.is_team_admin(team_id))
    and private.is_team_member(team_id)
  );

create policy "workspaces_delete" on public.workspaces
  for delete to authenticated
  using (private.is_workspace_owner(id) or private.is_team_owner(team_id));

-- ---- workspace_memberships -------------------------------------------

create policy "workspace_memberships_select" on public.workspace_memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_workspace_admin(workspace_id)
    or private.is_team_admin(private.get_workspace_team_id(workspace_id))
  );

create policy "workspace_memberships_insert" on public.workspace_memberships
  for insert to authenticated
  with check (
    private.is_workspace_admin(workspace_id)
    or private.is_team_admin(private.get_workspace_team_id(workspace_id))
  );

create policy "workspace_memberships_update" on public.workspace_memberships
  for update to authenticated
  using (
    private.is_workspace_admin(workspace_id)
    or private.is_team_admin(private.get_workspace_team_id(workspace_id))
  )
  with check (
    private.is_workspace_admin(workspace_id)
    or private.is_team_admin(private.get_workspace_team_id(workspace_id))
  );

create policy "workspace_memberships_delete" on public.workspace_memberships
  for delete to authenticated
  using (
    private.is_workspace_admin(workspace_id)
    or private.is_team_admin(private.get_workspace_team_id(workspace_id))
  );

-- ---- boards ----------------------------------------------------------

create policy "boards_select" on public.boards
  for select to authenticated
  using (private.is_team_member(private.get_workspace_team_id(workspace_id)));

create policy "boards_insert" on public.boards
  for insert to authenticated
  with check (
    private.is_workspace_admin(workspace_id)
    or private.is_team_admin(private.get_workspace_team_id(workspace_id))
  );

create policy "boards_update" on public.boards
  for update to authenticated
  using (
    private.is_workspace_admin(workspace_id)
    or private.is_team_admin(private.get_workspace_team_id(workspace_id))
  )
  with check (
    private.is_workspace_admin(workspace_id)
    or private.is_team_admin(private.get_workspace_team_id(workspace_id))
  );

create policy "boards_delete" on public.boards
  for delete to authenticated
  using (
    private.is_workspace_admin(workspace_id)
    or private.is_team_admin(private.get_workspace_team_id(workspace_id))
  );

-- ---- columns ---------------------------------------------------------

create policy "columns_select" on public.columns
  for select to authenticated
  using (
    private.is_team_member(
      private.get_workspace_team_id(private.get_board_workspace_id(board_id))
    )
  );

create policy "columns_insert" on public.columns
  for insert to authenticated
  with check (
    private.is_workspace_admin(private.get_board_workspace_id(board_id))
    or private.is_team_admin(
      private.get_workspace_team_id(private.get_board_workspace_id(board_id))
    )
  );

create policy "columns_update" on public.columns
  for update to authenticated
  using (
    private.is_workspace_admin(private.get_board_workspace_id(board_id))
    or private.is_team_admin(
      private.get_workspace_team_id(private.get_board_workspace_id(board_id))
    )
  )
  with check (
    private.is_workspace_admin(private.get_board_workspace_id(board_id))
    or private.is_team_admin(
      private.get_workspace_team_id(private.get_board_workspace_id(board_id))
    )
  );

create policy "columns_delete" on public.columns
  for delete to authenticated
  using (
    private.is_workspace_admin(private.get_board_workspace_id(board_id))
    or private.is_team_admin(
      private.get_workspace_team_id(private.get_board_workspace_id(board_id))
    )
  );

-- ---- tasks -----------------------------------------------------------

create policy "tasks_select" on public.tasks
  for select to authenticated
  using (
    private.is_team_member(
      private.get_workspace_team_id(
        private.get_board_workspace_id(private.get_column_board_id(column_id))
      )
    )
  );

create policy "tasks_insert" on public.tasks
  for insert to authenticated
  with check (
    private.is_team_member(
      private.get_workspace_team_id(
        private.get_board_workspace_id(private.get_column_board_id(column_id))
      )
    )
  );

create policy "tasks_update" on public.tasks
  for update to authenticated
  using (
    private.is_team_member(
      private.get_workspace_team_id(
        private.get_board_workspace_id(private.get_column_board_id(column_id))
      )
    )
  )
  with check (
    private.is_team_member(
      private.get_workspace_team_id(
        private.get_board_workspace_id(private.get_column_board_id(column_id))
      )
    )
  );

create policy "tasks_delete" on public.tasks
  for delete to authenticated
  using (
    private.is_team_member(
      private.get_workspace_team_id(
        private.get_board_workspace_id(private.get_column_board_id(column_id))
      )
    )
  );

-- ---------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to anon, authenticated, service_role;

-- private helper schema: only the server-side roles that evaluate RLS
-- policies may call the helper functions. The schema is not exposed to the
-- Data API (config only exposes `public` and `graphql_public`).
revoke all on all functions in schema private from public;
grant usage on schema private to authenticated, service_role;
grant execute on all functions in schema private to authenticated, service_role;
alter default privileges in schema private
  grant execute on functions to authenticated, service_role;
