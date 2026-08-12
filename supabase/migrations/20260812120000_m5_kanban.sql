-- =====================================================================
-- Orbit — M5: Kanban & drag-and-drop
--
-- Extends the M2 column/task model with the pieces a live Kanban board
-- needs without duplicating tables:
--
--   1. tasks.board_id            Denormalized parent-board reference so
--                                Supabase Realtime can subscribe to a
--                                single board (postgres_changes only
--                                supports one equality filter) and so
--                                board queries are a single indexed read.
--                                Always kept consistent with column_id by
--                                a BEFORE trigger.
--   2. tasks.position            widened to double precision so drag &
--                                drop can persist ordering by rewriting a
--                                SINGLE row (midpoint positioning) instead
--                                of reindexing whole columns. A single-row
--                                move means Realtime emits one event and
--                                concurrent drags don't clobber each other.
--   3. tasks.status              the status CHECK is dropped; status is now
--                                derived from the column the task lives in
--                                (the column IS the status lane, like
--                                Linear). The sync trigger keeps it in
--                                step with column_id so "moving a task
--                                updates both status and column".
--   4. Default columns           every board gets Backlog / Todo / In
--                                Progress / Done on creation (trigger) and
--                                existing boards are backfilled.
--   5. profiles                  a public mirror of auth.users (name/email/
--                                avatar) so task cards can render an
--                                assignee without exposing auth schema.
--                                RLS limits visibility to yourself and
--                                people you share a team with.
--   6. Realtime                  tasks are added to the supabase_realtime
--                                publication. RLS still gates what each
--                                subscriber can see.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) tasks.board_id + column/status sync trigger
-- ---------------------------------------------------------------------

alter table public.tasks add column board_id uuid;

create index tasks_board_id_idx on public.tasks (board_id);

-- Existing rows: derive board from the owning column (FK guarantees the
-- column exists; there are no orphan tasks today).
update public.tasks t
set board_id = c.board_id
from public.columns c
where c.id = t.column_id;

alter table public.tasks alter column board_id set not null;

-- Keep board_id and status consistent with column_id. Fires on insert and
-- whenever the column (the status lane) changes. SECURITY DEFINER follows
-- the existing helper-trigger pattern so RLS never blocks the sync.
create or replace function private.sync_task_column_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_board_id uuid;
  v_status   text;
begin
  select board_id, name into v_board_id, v_status
  from public.columns
  where id = new.column_id;

  if v_board_id is null then
    raise exception 'task column % does not exist', new.column_id;
  end if;

  new.board_id := v_board_id;
  new.status   := v_status;
  return new;
end;
$$;

create trigger tasks_before_insert_or_column_update_sync
  before insert or update of column_id on public.tasks
  for each row execute function private.sync_task_column_refs();

-- ---------------------------------------------------------------------
-- 2) tasks.position -> double precision (fractional ordering)
-- ---------------------------------------------------------------------

alter table public.tasks
  alter column position type double precision using position::double precision;

-- ---------------------------------------------------------------------
-- 3) tasks.status: drop the fixed CHECK; status is derived from column
-- ---------------------------------------------------------------------

alter table public.tasks drop constraint if exists tasks_status_check;

-- ---------------------------------------------------------------------
-- 4) Default columns for every board
-- ---------------------------------------------------------------------

-- Seed the four default status lanes whenever a board is created.
create or replace function private.seed_board_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.columns (board_id, name, position)
  select new.id, v.name, v.position
  from (values ('Backlog', 0), ('Todo', 1), ('In Progress', 2), ('Done', 3)) as v (name, position);
  return new;
end;
$$;

create trigger boards_after_insert_seed_columns
  after insert on public.boards
  for each row execute function private.seed_board_columns();

-- Backfill boards that existed before this migration (including boards that
-- only have a partial set of lanes from earlier testing).
insert into public.columns (board_id, name, position)
select b.id, v.name, v.position
from public.boards b
cross join (values ('Backlog', 0), ('Todo', 1), ('In Progress', 2), ('Done', 3)) as v (name, position)
where not exists (
  select 1
  from public.columns c
  where c.board_id = b.id
    and c.name = v.name
);

-- ---------------------------------------------------------------------
-- 5) profiles (public mirror of auth.users)
-- ---------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  email      text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Mirror auth.users into profiles as users sign up / update their profile.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email     = excluded.email,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function private.handle_new_user();

-- Backfill profiles for users created before this migration.
insert into public.profiles (id, full_name, email, avatar_url)
select
  au.id,
  au.raw_user_meta_data ->> 'full_name',
  au.email,
  au.raw_user_meta_data ->> 'avatar_url'
from auth.users au
on conflict (id) do nothing;

alter table public.profiles enable row level security;

-- Do two users share at least one team?
create or replace function private.shares_team(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_memberships mine
    join public.team_memberships theirs on theirs.team_id = mine.team_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
  )
$$;

create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_team(id));

create policy "profiles_insert" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profiles_delete" on public.profiles
  for delete to authenticated
  using (id = (select auth.uid()));

grant all on public.profiles to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 6) Realtime
-- ---------------------------------------------------------------------

-- Realtime only carries the primary key for deleted rows under the default
-- replica identity, so the board_id=eq.xxx filter could never match a DELETE
-- event and other clients would never see tasks disappear. FULL identity
-- ships the whole old row in the WAL so deletes are filterable too.
alter table public.tasks replica identity full;

alter publication supabase_realtime add table public.tasks;
