-- =====================================================================
-- Orbit v2 — workspace → team → project → work items, with comments,
-- activity, notifications and invitations. Greenfield (no prod data).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) reset (safe on a fresh project; drops the v1 objects if present)
-- ---------------------------------------------------------------------
drop table if exists public.task_labels, public.tasks, public.columns, public.boards,
  public.invitations, public.labels, public.workspace_memberships, public.workspaces,
  public.team_memberships, public.teams, public.profiles cascade;
drop function if exists public.accept_invitation(text), public.get_invitation(text);
drop schema if exists private cascade;

-- ---------------------------------------------------------------------
-- 1) types + private schema
-- ---------------------------------------------------------------------
create schema private;

create type public.ws_role as enum ('owner', 'admin', 'member');
create type public.status_category as enum ('backlog', 'unstarted', 'started', 'completed', 'canceled');
create type public.item_priority as enum ('none', 'low', 'medium', 'high', 'urgent');
create type public.project_status as enum ('backlog', 'planned', 'in_progress', 'completed', 'canceled');
create type public.project_health as enum ('on_track', 'at_risk', 'off_track');
create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type public.notification_kind as enum ('assigned', 'mentioned', 'commented', 'status_changed', 'invited', 'member_joined', 'project_update');

create or replace function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function private.bump_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 2) tables
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.workspaces (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(name) between 1 and 80),
  slug          text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'),
  key           text not null check (key ~ '^[A-Z][A-Z0-9]{1,4}$'),
  item_counter  integer not null default 0,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index workspaces_created_by_idx on public.workspaces (created_by);

create table public.workspace_memberships (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         public.ws_role not null default 'member',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_memberships_user_id_idx on public.workspace_memberships (user_id);

create table public.teams (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, workspace_id)
);
create index teams_workspace_id_idx on public.teams (workspace_id);
create unique index teams_one_default_idx on public.teams (workspace_id) where is_default;

create table public.statuses (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  name       text not null check (length(name) between 1 and 40),
  category   public.status_category not null,
  color      text not null default 'slate',
  position   double precision not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, team_id)
);
create unique index statuses_team_name_key on public.statuses (team_id, lower(name));
create unique index statuses_one_default_idx on public.statuses (team_id) where is_default;
create index statuses_team_position_idx on public.statuses (team_id, position);

create table public.labels (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null check (length(name) between 1 and 40),
  color        text not null default 'slate',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index labels_workspace_name_key on public.labels (workspace_id, lower(name));

create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  team_id      uuid not null,
  name         text not null check (length(name) between 1 and 120),
  slug         text not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$'),
  description  text,
  lead_id      uuid references public.profiles (id) on delete set null,
  status       public.project_status not null default 'planned',
  health       public.project_health not null default 'on_track',
  start_date   date,
  target_date  date,
  archived_at  timestamptz,
  created_by   uuid references public.profiles (id) on delete set null,
  version      integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, slug),
  foreign key (team_id, workspace_id) references public.teams (id, workspace_id) on delete cascade
);
create index projects_workspace_idx on public.projects (workspace_id) where archived_at is null;
create index projects_lead_idx on public.projects (lead_id);
create index projects_team_idx on public.projects (team_id);
create index projects_created_by_idx on public.projects (created_by);

create table public.project_memberships (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index project_memberships_user_idx on public.project_memberships (user_id);

create table public.project_updates (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,
  health     public.project_health not null,
  body       text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index project_updates_project_idx on public.project_updates (project_id, created_at desc);
create index project_updates_author_idx on public.project_updates (author_id);

create table public.work_items (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  team_id      uuid not null,
  project_id   uuid not null references public.projects (id) on delete cascade,
  number       integer not null,
  key          text not null,
  title        text not null check (length(title) between 1 and 300),
  description  text,
  status_id    uuid not null,
  priority     public.item_priority not null default 'none',
  assignee_id  uuid references public.profiles (id) on delete set null,
  due_date     date,
  position     double precision not null default 0,
  completed_at timestamptz,
  archived_at  timestamptz,
  created_by   uuid references public.profiles (id) on delete set null,
  version      integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, number),
  unique (workspace_id, key),
  foreign key (team_id, workspace_id) references public.teams (id, workspace_id) on delete cascade,
  foreign key (status_id, team_id) references public.statuses (id, team_id)
);
create index work_items_project_status_idx on public.work_items (project_id, status_id, position) where archived_at is null;
create index work_items_assignee_idx on public.work_items (assignee_id);
create index work_items_workspace_idx on public.work_items (workspace_id, updated_at desc);
create index work_items_created_by_idx on public.work_items (created_by);
create index work_items_status_idx on public.work_items (status_id);
create index work_items_team_idx on public.work_items (team_id);

create table public.work_item_labels (
  work_item_id uuid not null references public.work_items (id) on delete cascade,
  label_id     uuid not null references public.labels (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (work_item_id, label_id)
);
create index work_item_labels_label_idx on public.work_item_labels (label_id);

create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  author_id    uuid references public.profiles (id) on delete set null,
  body         text not null check (length(body) between 1 and 8000),
  mentions     uuid[] not null default '{}',
  edited_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index comments_item_idx on public.comments (work_item_id, created_at);
create index comments_author_idx on public.comments (author_id);
create index comments_workspace_idx on public.comments (workspace_id);

create table public.activity_log (
  id           bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete set null,
  project_id   uuid references public.projects (id) on delete cascade,
  work_item_id uuid references public.work_items (id) on delete cascade,
  comment_id   uuid references public.comments (id) on delete set null,
  action       text not null,
  data         jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index activity_workspace_idx on public.activity_log (workspace_id, created_at desc);
create index activity_item_idx on public.activity_log (work_item_id, created_at desc);
create index activity_project_idx on public.activity_log (project_id, created_at desc);
create index activity_actor_idx on public.activity_log (actor_id);
create index activity_comment_idx on public.activity_log (comment_id);

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind         public.notification_kind not null,
  actor_id     uuid references public.profiles (id) on delete set null,
  work_item_id uuid references public.work_items (id) on delete cascade,
  project_id   uuid references public.projects (id) on delete cascade,
  comment_id   uuid references public.comments (id) on delete cascade,
  title        text not null,
  body         text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_workspace_idx on public.notifications (workspace_id);
create index notifications_actor_idx on public.notifications (actor_id);
create index notifications_item_idx on public.notifications (work_item_id);
create index notifications_project_idx on public.notifications (project_id);
create index notifications_comment_idx on public.notifications (comment_id);

create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email        text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role         public.ws_role not null default 'member' check (role <> 'owner'),
  token_hash   text not null unique,
  invited_by   uuid references public.profiles (id) on delete set null,
  status       public.invite_status not null default 'pending',
  expires_at   timestamptz not null default (now() + interval '14 days'),
  accepted_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index invitations_pending_unique on public.invitations (workspace_id, lower(email)) where status = 'pending';
create index invitations_workspace_idx on public.invitations (workspace_id);
create index invitations_invited_by_idx on public.invitations (invited_by);

-- updated_at / version triggers
create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger workspaces_set_updated_at before update on public.workspaces for each row execute function private.set_updated_at();
create trigger workspace_memberships_set_updated_at before update on public.workspace_memberships for each row execute function private.set_updated_at();
create trigger teams_set_updated_at before update on public.teams for each row execute function private.set_updated_at();
create trigger statuses_set_updated_at before update on public.statuses for each row execute function private.set_updated_at();
create trigger labels_set_updated_at before update on public.labels for each row execute function private.set_updated_at();
create trigger projects_bump_version before update on public.projects for each row execute function private.bump_version();
create trigger work_items_bump_version before update on public.work_items for each row execute function private.bump_version();
create trigger comments_set_updated_at before update on public.comments for each row execute function private.set_updated_at();
create trigger invitations_set_updated_at before update on public.invitations for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- 3) helpers (SECURITY DEFINER, search_path locked)
-- ---------------------------------------------------------------------
create or replace function private.rank(p_role public.ws_role) returns integer
language sql immutable set search_path = '' as $$
  select case p_role when 'owner' then 3 when 'admin' then 2 else 1 end
$$;

create or replace function private.ws_role(p_ws uuid) returns public.ws_role
language sql stable security definer set search_path = '' as $$
  select role from public.workspace_memberships
  where workspace_id = p_ws and user_id = (select auth.uid())
$$;

create or replace function private.is_ws_member(p_ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.workspace_memberships
    where workspace_id = p_ws and user_id = (select auth.uid()))
$$;

create or replace function private.is_ws_admin(p_ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.ws_role(p_ws) in ('owner', 'admin'), false)
$$;

create or replace function private.is_ws_owner(p_ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.ws_role(p_ws) = 'owner', false)
$$;

create or replace function private.team_ws(p_team uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select workspace_id from public.teams where id = p_team
$$;

create or replace function private.project_ws(p_project uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select workspace_id from public.projects where id = p_project
$$;

create or replace function private.project_lead(p_project uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select lead_id from public.projects where id = p_project
$$;

create or replace function private.item_ws(p_item uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select workspace_id from public.work_items where id = p_item
$$;

create or replace function private.shares_workspace(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_memberships mine
    join public.workspace_memberships theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user)
$$;

create or replace function private.user_email() returns text
language sql stable security definer set search_path = '' as $$
  select lower(email) from auth.users where id = (select auth.uid())
$$;

-- ---------------------------------------------------------------------
-- 4) domain triggers
-- ---------------------------------------------------------------------
-- profiles mirror
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email, new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
end $$;
create trigger on_auth_user_created after insert or update on auth.users
  for each row execute function private.handle_new_user();

-- workspace bootstrap: creator, owner membership, default team (statuses seeded by team trigger), labels
create or replace function private.workspace_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is null then new.created_by := (select auth.uid()); end if;
  return new;
end $$;
create trigger workspaces_before_insert before insert on public.workspaces
  for each row execute function private.workspace_before_insert();

create or replace function private.workspace_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is not null then
    insert into public.workspace_memberships (workspace_id, user_id, role) values (new.id, new.created_by, 'owner');
  end if;
  insert into public.teams (workspace_id, name, is_default) values (new.id, 'General', true);
  insert into public.labels (workspace_id, name, color) values
    (new.id, 'Bug', 'red'), (new.id, 'Feature', 'violet'), (new.id, 'Improvement', 'sky'), (new.id, 'Design', 'pink');
  return new;
end $$;
create trigger workspaces_after_insert after insert on public.workspaces
  for each row execute function private.workspace_after_insert();

-- team defaults: statuses
create or replace function private.team_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.statuses (team_id, name, category, color, position, is_default) values
    (new.id, 'Backlog',     'backlog',   'slate',   1, false),
    (new.id, 'Todo',        'unstarted', 'sky',     2, true),
    (new.id, 'In Progress', 'started',   'violet',  3, false),
    (new.id, 'In Review',   'started',   'amber',   4, false),
    (new.id, 'Done',        'completed', 'emerald', 5, false),
    (new.id, 'Canceled',    'canceled',  'zinc',    6, false);
  return new;
end $$;
create trigger teams_after_insert after insert on public.teams
  for each row execute function private.team_after_insert();

-- membership: last owner protection + immutable identity columns
create or replace function private.membership_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_others integer;
begin
  if tg_op = 'UPDATE' and (new.user_id <> old.user_id or new.workspace_id <> old.workspace_id) then
    raise exception 'membership identity is immutable';
  end if;
  -- When the workspace itself is being deleted (cascade), the row is already
  -- gone and the last-owner rule must not block the cascade.
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner')
     and exists (select 1 from public.workspaces w where w.id = old.workspace_id) then
    select count(*) into v_others from public.workspace_memberships
    where workspace_id = old.workspace_id and user_id <> old.user_id and role = 'owner';
    if v_others = 0 then
      raise exception using errcode = 'P0001', message = 'last_owner';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger workspace_memberships_guard before update or delete on public.workspace_memberships
  for each row execute function private.membership_guard();

-- projects: defaults + lead membership
create or replace function private.project_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is null then new.created_by := (select auth.uid()); end if;
  if new.lead_id is null then new.lead_id := new.created_by; end if;
  if new.team_id is null then
    select id into new.team_id from public.teams where workspace_id = new.workspace_id and is_default limit 1;
  end if;
  return new;
end $$;
create trigger projects_before_insert before insert on public.projects
  for each row execute function private.project_before_insert();

create or replace function private.project_after_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.lead_id is not null then
    insert into public.project_memberships (project_id, user_id) values (new.id, new.lead_id) on conflict do nothing;
  end if;
  if tg_op = 'INSERT' then
    insert into public.activity_log (workspace_id, actor_id, project_id, action, data)
    values (new.workspace_id, (select auth.uid()), new.id, 'project_created', jsonb_build_object('name', new.name));
  elsif old.status <> new.status then
    insert into public.activity_log (workspace_id, actor_id, project_id, action, data)
    values (new.workspace_id, (select auth.uid()), new.id, 'project_status_changed',
      jsonb_build_object('name', new.name, 'from', old.status, 'to', new.status));
  end if;
  return new;
end $$;
create trigger projects_after_write after insert or update on public.projects
  for each row execute function private.project_after_write();

-- work items: key assignment, defaults, guards
create or replace function private.work_item_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_ws uuid; v_team uuid; v_key text; v_n integer; v_cat public.status_category;
begin
  select workspace_id, team_id into v_ws, v_team from public.projects where id = new.project_id;
  if v_ws is null then raise exception 'project not found'; end if;
  new.workspace_id := v_ws;
  new.team_id := v_team;
  if new.created_by is null then new.created_by := (select auth.uid()); end if;
  if new.status_id is null then
    select id into new.status_id from public.statuses where team_id = v_team and is_default limit 1;
  end if;
  update public.workspaces set item_counter = item_counter + 1 where id = v_ws returning item_counter, key into v_n, v_key;
  new.number := v_n;
  new.key := v_key || '-' || v_n;
  if new.position = 0 then
    select coalesce(max(position), 0) + 1024 into new.position from public.work_items
    where project_id = new.project_id and status_id = new.status_id;
  end if;
  select category into v_cat from public.statuses where id = new.status_id;
  if v_cat = 'completed' then new.completed_at := now(); end if;
  return new;
end $$;
create trigger work_items_before_insert before insert on public.work_items
  for each row execute function private.work_item_before_insert();

create or replace function private.work_item_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_cat public.status_category;
begin
  new.workspace_id := old.workspace_id;
  new.team_id := old.team_id;
  new.number := old.number;
  new.key := old.key;
  new.created_by := old.created_by;
  if new.status_id <> old.status_id then
    select category into v_cat from public.statuses where id = new.status_id;
    if v_cat = 'completed' then new.completed_at := coalesce(new.completed_at, now());
    else new.completed_at := null; end if;
  end if;
  return new;
end $$;
create trigger work_items_before_update before update on public.work_items
  for each row execute function private.work_item_before_update();

create or replace function private.work_item_assignee_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.assignee_id is not null and not exists (
    select 1 from public.workspace_memberships where workspace_id = new.workspace_id and user_id = new.assignee_id) then
    raise exception using errcode = 'P0001', message = 'assignee_not_member';
  end if;
  return new;
end $$;
create trigger work_items_zz_assignee_guard before insert or update of assignee_id on public.work_items
  for each row execute function private.work_item_assignee_guard();

-- activity for work items
create or replace function private.status_name(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$ select name from public.statuses where id = p_id $$;
create or replace function private.profile_name(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(full_name, ''), email) from public.profiles where id = p_id $$;

create or replace function private.work_item_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log (workspace_id, actor_id, project_id, work_item_id, action, data)
    values (new.workspace_id, v_actor, new.project_id, new.id, 'item_created',
      jsonb_build_object('key', new.key, 'title', new.title, 'assignee_id', new.assignee_id,
        'assignee', private.profile_name(new.assignee_id)));
    return new;
  end if;
  if new.archived_at is not null and old.archived_at is null then
    insert into public.activity_log (workspace_id, actor_id, project_id, work_item_id, action, data)
    values (new.workspace_id, v_actor, new.project_id, new.id, 'item_archived', jsonb_build_object('key', new.key, 'title', new.title));
    return new;
  end if;
  if new.status_id <> old.status_id then
    insert into public.activity_log (workspace_id, actor_id, project_id, work_item_id, action, data)
    values (new.workspace_id, v_actor, new.project_id, new.id, 'status_changed',
      jsonb_build_object('key', new.key, 'title', new.title, 'from', private.status_name(old.status_id),
        'to', private.status_name(new.status_id), 'to_id', new.status_id));
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    insert into public.activity_log (workspace_id, actor_id, project_id, work_item_id, action, data)
    values (new.workspace_id, v_actor, new.project_id, new.id, 'assignee_changed',
      jsonb_build_object('key', new.key, 'title', new.title, 'from', private.profile_name(old.assignee_id),
        'to', private.profile_name(new.assignee_id), 'assignee_id', new.assignee_id));
  end if;
  if new.priority <> old.priority then
    insert into public.activity_log (workspace_id, actor_id, project_id, work_item_id, action, data)
    values (new.workspace_id, v_actor, new.project_id, new.id, 'priority_changed',
      jsonb_build_object('key', new.key, 'title', new.title, 'from', old.priority, 'to', new.priority));
  end if;
  if new.title <> old.title then
    insert into public.activity_log (workspace_id, actor_id, project_id, work_item_id, action, data)
    values (new.workspace_id, v_actor, new.project_id, new.id, 'title_changed',
      jsonb_build_object('key', new.key, 'from', old.title, 'to', new.title));
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.activity_log (workspace_id, actor_id, project_id, work_item_id, action, data)
    values (new.workspace_id, v_actor, new.project_id, new.id, 'due_date_changed',
      jsonb_build_object('key', new.key, 'title', new.title, 'from', old.due_date, 'to', new.due_date));
  end if;
  if new.description is distinct from old.description then
    insert into public.activity_log (workspace_id, actor_id, project_id, work_item_id, action, data)
    values (new.workspace_id, v_actor, new.project_id, new.id, 'description_changed', jsonb_build_object('key', new.key, 'title', new.title));
  end if;
  if new.project_id <> old.project_id then
    insert into public.activity_log (workspace_id, actor_id, project_id, work_item_id, action, data)
    values (new.workspace_id, v_actor, new.project_id, new.id, 'project_changed', jsonb_build_object('key', new.key, 'title', new.title));
  end if;
  return new;
end $$;
create trigger work_items_activity after insert or update on public.work_items
  for each row execute function private.work_item_activity();

-- comments: defaults + activity
create or replace function private.comment_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.author_id := (select auth.uid());
  select workspace_id into new.workspace_id from public.work_items where id = new.work_item_id;
  return new;
end $$;
create trigger comments_before_insert before insert on public.comments
  for each row execute function private.comment_before_insert();

create or replace function private.comment_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.author_id := old.author_id;
  new.work_item_id := old.work_item_id;
  new.workspace_id := old.workspace_id;
  if new.body <> old.body then new.edited_at := now(); end if;
  return new;
end $$;
create trigger comments_before_update before update on public.comments
  for each row execute function private.comment_before_update();

create or replace function private.comment_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_item record;
begin
  select key, title, project_id into v_item from public.work_items where id = new.work_item_id;
  insert into public.activity_log (workspace_id, actor_id, project_id, work_item_id, comment_id, action, data)
  values (new.workspace_id, new.author_id, v_item.project_id, new.work_item_id, new.id, 'comment_added',
    jsonb_build_object('key', v_item.key, 'title', v_item.title, 'excerpt', left(new.body, 140), 'mentions', to_jsonb(new.mentions)));
  return new;
end $$;
create trigger comments_after_insert after insert on public.comments
  for each row execute function private.comment_after_insert();

-- notifications fan-out from activity
create or replace function private.notify_from_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_item record; v_uid uuid; v_actor_name text := coalesce(private.profile_name(new.actor_id), 'Someone');
  v_mentions uuid[] := '{}';
begin
  if new.work_item_id is null then return new; end if;
  select id, key, title, assignee_id, created_by into v_item from public.work_items where id = new.work_item_id;
  if new.data ? 'mentions' and jsonb_typeof(new.data -> 'mentions') = 'array' then
    select coalesce(array_agg(x::uuid), '{}') into v_mentions from jsonb_array_elements_text(new.data -> 'mentions') as x;
  end if;

  if new.action in ('item_created', 'assignee_changed') then
    v_uid := (new.data ->> 'assignee_id')::uuid;
    if v_uid is not null and v_uid <> coalesce(new.actor_id, '00000000-0000-0000-0000-000000000000') then
      insert into public.notifications (user_id, workspace_id, kind, actor_id, work_item_id, project_id, title, body)
      values (v_uid, new.workspace_id, 'assigned', new.actor_id, new.work_item_id, new.project_id,
        v_actor_name || ' assigned you ' || v_item.key, v_item.title);
    end if;
  elsif new.action = 'status_changed' then
    for v_uid in select distinct u from unnest(array[v_item.assignee_id, v_item.created_by]) as u
      where u is not null and u <> coalesce(new.actor_id, '00000000-0000-0000-0000-000000000000')
    loop
      insert into public.notifications (user_id, workspace_id, kind, actor_id, work_item_id, project_id, title, body)
      values (v_uid, new.workspace_id, 'status_changed', new.actor_id, new.work_item_id, new.project_id,
        v_actor_name || ' moved ' || v_item.key || ' to ' || (new.data ->> 'to'), v_item.title);
    end loop;
  elsif new.action = 'comment_added' then
    for v_uid in select distinct u from unnest(array[v_item.assignee_id, v_item.created_by]) as u
      where u is not null and u <> coalesce(new.actor_id, '00000000-0000-0000-0000-000000000000')
        and not (u = any (v_mentions))
    loop
      insert into public.notifications (user_id, workspace_id, kind, actor_id, work_item_id, project_id, comment_id, title, body)
      values (v_uid, new.workspace_id, 'commented', new.actor_id, new.work_item_id, new.project_id, new.comment_id,
        v_actor_name || ' commented on ' || v_item.key, new.data ->> 'excerpt');
    end loop;
    foreach v_uid in array v_mentions loop
      if v_uid <> coalesce(new.actor_id, '00000000-0000-0000-0000-000000000000') then
        insert into public.notifications (user_id, workspace_id, kind, actor_id, work_item_id, project_id, comment_id, title, body)
        values (v_uid, new.workspace_id, 'mentioned', new.actor_id, new.work_item_id, new.project_id, new.comment_id,
          v_actor_name || ' mentioned you in ' || v_item.key, new.data ->> 'excerpt');
      end if;
    end loop;
  end if;
  return new;
end $$;
create trigger activity_notify after insert on public.activity_log
  for each row execute function private.notify_from_activity();

-- invitations: notify an existing account holder
create or replace function private.invitation_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid; v_ws text;
begin
  select id into v_uid from public.profiles where lower(email) = lower(new.email) limit 1;
  if v_uid is not null then
    select name into v_ws from public.workspaces where id = new.workspace_id;
    insert into public.notifications (user_id, workspace_id, kind, actor_id, title, body)
    values (v_uid, new.workspace_id, 'invited', new.invited_by,
      coalesce(private.profile_name(new.invited_by), 'Someone') || ' invited you to ' || v_ws,
      'Open the invitation link they shared to join.');
  end if;
  return new;
end $$;
create trigger invitations_after_insert after insert on public.invitations
  for each row execute function private.invitation_after_insert();

-- project updates copy health
create or replace function private.project_update_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.projects set health = new.health where id = new.project_id;
  insert into public.activity_log (workspace_id, actor_id, project_id, action, data)
  values (new.workspace_id, new.author_id, new.project_id, 'project_update',
    jsonb_build_object('health', new.health, 'excerpt', left(new.body, 140)));
  return new;
end $$;
create trigger project_updates_after_insert after insert on public.project_updates
  for each row execute function private.project_update_after_insert();

create or replace function private.project_update_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.author_id := (select auth.uid());
  select workspace_id into new.workspace_id from public.projects where id = new.project_id;
  return new;
end $$;
create trigger project_updates_before_insert before insert on public.project_updates
  for each row execute function private.project_update_before_insert();

-- ---------------------------------------------------------------------
-- 5) RPCs
-- ---------------------------------------------------------------------
create or replace function public.create_workspace(p_name text, p_slug text, p_key text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  insert into public.workspaces (name, slug, key, created_by) values (p_name, p_slug, p_key, (select auth.uid()))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.create_invitation(p_workspace uuid, p_email text, p_role public.ws_role)
returns text language plpgsql security definer set search_path = '' as $$
declare v_token text; v_role public.ws_role;
begin
  v_role := private.ws_role(p_workspace);
  if v_role is null or v_role = 'member' then raise exception using errcode = 'P0001', message = 'forbidden'; end if;
  if p_role = 'owner' or private.rank(p_role) > private.rank(v_role) then
    raise exception using errcode = 'P0001', message = 'role_too_high';
  end if;
  if exists (select 1 from public.workspace_memberships m join public.profiles p on p.id = m.user_id
             where m.workspace_id = p_workspace and lower(p.email) = lower(p_email)) then
    raise exception using errcode = 'P0001', message = 'already_member';
  end if;
  update public.invitations set status = 'revoked' where workspace_id = p_workspace and lower(email) = lower(p_email) and status = 'pending';
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.invitations (workspace_id, email, role, token_hash, invited_by)
  values (p_workspace, lower(p_email), p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), (select auth.uid()));
  return v_token;
end $$;

create or replace function public.get_invitation(p_token text)
returns table (workspace_id uuid, workspace_name text, workspace_slug text, inviter_name text,
               email_masked text, role public.ws_role, status public.invite_status, expires_at timestamptz, email_matches boolean)
language sql stable security definer set search_path = '' as $$
  select i.workspace_id, w.name, w.slug, private.profile_name(i.invited_by),
    left(i.email, 2) || '***@' || split_part(i.email, '@', 2), i.role,
    case when i.status = 'pending' and i.expires_at < now() then 'expired'::public.invite_status else i.status end,
    i.expires_at, (private.user_email() = lower(i.email))
  from public.invitations i join public.workspaces w on w.id = i.workspace_id
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_inv public.invitations%rowtype; v_uid uuid := (select auth.uid()); v_ws_name text;
begin
  if v_uid is null then raise exception using errcode = 'P0001', message = 'not_authenticated'; end if;
  select * into v_inv from public.invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if not found or v_inv.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'invalid_or_used_invitation';
  end if;
  if v_inv.expires_at < now() then
    update public.invitations set status = 'expired' where id = v_inv.id;
    raise exception using errcode = 'P0001', message = 'invitation_expired';
  end if;
  if private.user_email() <> lower(v_inv.email) then
    raise exception using errcode = 'P0001', message = 'email_mismatch';
  end if;
  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (v_inv.workspace_id, v_uid, v_inv.role) on conflict (workspace_id, user_id) do nothing;
  update public.invitations set status = 'accepted', accepted_at = now() where id = v_inv.id;
  if v_inv.invited_by is not null and v_inv.invited_by <> v_uid then
    select name into v_ws_name from public.workspaces where id = v_inv.workspace_id;
    insert into public.notifications (user_id, workspace_id, kind, actor_id, title, body)
    values (v_inv.invited_by, v_inv.workspace_id, 'member_joined', v_uid,
      coalesce(private.profile_name(v_uid), v_inv.email) || ' joined ' || v_ws_name, 'Your invitation was accepted.');
  end if;
  return v_inv.workspace_id;
end $$;

create or replace function public.transfer_ownership(p_workspace uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_ws_owner(p_workspace) then raise exception using errcode = 'P0001', message = 'forbidden'; end if;
  if not exists (select 1 from public.workspace_memberships where workspace_id = p_workspace and user_id = p_user) then
    raise exception using errcode = 'P0001', message = 'not_a_member';
  end if;
  update public.workspace_memberships set role = 'owner' where workspace_id = p_workspace and user_id = p_user;
  update public.workspace_memberships set role = 'admin' where workspace_id = p_workspace and user_id = (select auth.uid());
end $$;

-- sample data for a fresh workspace (runs as the creator)
create or replace function public.seed_sample_project(p_workspace uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_team uuid; v_project uuid;
  s_backlog uuid; s_todo uuid; s_prog uuid; s_review uuid; s_done uuid;
  l_feature uuid; l_design uuid; v_item uuid;
begin
  if not private.is_ws_member(p_workspace) then raise exception using errcode = 'P0001', message = 'forbidden'; end if;
  select id into v_team from public.teams where workspace_id = p_workspace and is_default;
  select id into s_backlog from public.statuses where team_id = v_team and name = 'Backlog';
  select id into s_todo from public.statuses where team_id = v_team and name = 'Todo';
  select id into s_prog from public.statuses where team_id = v_team and name = 'In Progress';
  select id into s_review from public.statuses where team_id = v_team and name = 'In Review';
  select id into s_done from public.statuses where team_id = v_team and name = 'Done';
  select id into l_feature from public.labels where workspace_id = p_workspace and name = 'Feature';
  select id into l_design from public.labels where workspace_id = p_workspace and name = 'Design';

  insert into public.projects (workspace_id, team_id, name, slug, description, lead_id, status, health, created_by, target_date)
  values (p_workspace, v_team, 'Getting started with Orbit', 'getting-started',
    'A small sample project so you can see how Orbit works. Move cards, open them, leave a comment, and invite a teammate. Delete this project whenever you like.',
    v_uid, 'in_progress', 'on_track', v_uid, current_date + 14)
  returning id into v_project;

  insert into public.work_items (project_id, title, description, status_id, priority, assignee_id, due_date) values
    (v_project, 'Invite your first teammate', 'Go to Settings → Members, enter an email and share the invitation link. No email service needed.', s_todo, 'high', v_uid, current_date + 1),
    (v_project, 'Create your first real project', 'Projects hold the work for one outcome: a launch, a redesign, a client. Give it a lead and a target date.', s_todo, 'medium', v_uid, current_date + 3),
    (v_project, 'Drag this card to In Progress', 'Everyone looking at this board sees the move instantly — no refresh.', s_todo, 'low', null, null),
    (v_project, 'Open a card and leave a comment', 'Click any card to open it. Comments and history live on the card so nobody has to ask what happened.', s_prog, 'medium', v_uid, null),
    (v_project, 'Check Pulse for what changed', 'Pulse shows who is working on what, overdue work, and recent activity across the workspace.', s_prog, 'none', null, null),
    (v_project, 'Review the statuses for your team', 'Backlog, Todo, In Progress, In Review, Done and Canceled are defaults — rename or add more in Settings.', s_review, 'low', null, null),
    (v_project, 'Set up your workspace', 'Name, key and members are done. Nice.', s_done, 'medium', v_uid, null),
    (v_project, 'Explore the sample board', 'Cards in Backlog are ideas you have not committed to yet.', s_backlog, 'none', null, null);

  -- Default labels can be renamed or deleted before a second sample project
  -- is seeded, so attach them only when they still exist.
  if l_feature is not null then
    for v_item in select id from public.work_items where project_id = v_project and title in ('Create your first real project', 'Invite your first teammate') loop
      insert into public.work_item_labels (work_item_id, label_id) values (v_item, l_feature) on conflict do nothing;
    end loop;
  end if;
  if l_design is not null then
    for v_item in select id from public.work_items where project_id = v_project and title = 'Review the statuses for your team' loop
      insert into public.work_item_labels (work_item_id, label_id) values (v_item, l_design) on conflict do nothing;
    end loop;
  end if;
  select id into v_item from public.work_items where project_id = v_project and title = 'Open a card and leave a comment';
  insert into public.comments (work_item_id, body) values (v_item, 'Welcome to Orbit! This is what a comment looks like. Mention a teammate with @ to notify them.');
  return v_project;
end $$;

-- ---------------------------------------------------------------------
-- 6) grants + RLS
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon, public;
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
grant execute on function public.get_invitation(text) to anon;
alter default privileges in schema public grant all on tables to authenticated, service_role;
alter default privileges in schema public grant all on sequences to authenticated, service_role;
alter default privileges in schema public grant execute on functions to authenticated, service_role;
revoke all on all functions in schema private from public, anon;
grant usage on schema private to authenticated, service_role;
grant execute on all functions in schema private to authenticated, service_role;
alter default privileges in schema private grant execute on functions to authenticated, service_role;
revoke insert, update, delete on public.activity_log from authenticated;
revoke insert, delete on public.notifications from authenticated;
revoke insert on public.workspace_memberships from authenticated;
revoke insert on public.invitations from authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.teams enable row level security;
alter table public.statuses enable row level security;
alter table public.labels enable row level security;
alter table public.projects enable row level security;
alter table public.project_memberships enable row level security;
alter table public.project_updates enable row level security;
alter table public.work_items enable row level security;
alter table public.work_item_labels enable row level security;
alter table public.comments enable row level security;
alter table public.activity_log enable row level security;
alter table public.notifications enable row level security;
alter table public.invitations enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_workspace(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy workspaces_select on public.workspaces for select to authenticated using (private.is_ws_member(id));
create policy workspaces_update on public.workspaces for update to authenticated using (private.is_ws_admin(id)) with check (private.is_ws_admin(id));
create policy workspaces_delete on public.workspaces for delete to authenticated using (private.is_ws_owner(id));

create policy memberships_select on public.workspace_memberships for select to authenticated using (private.is_ws_member(workspace_id));
create policy memberships_update on public.workspace_memberships for update to authenticated
  using (private.is_ws_admin(workspace_id) and private.rank(role) < private.rank(private.ws_role(workspace_id)))
  with check (private.rank(role) <= private.rank(private.ws_role(workspace_id)));
create policy memberships_delete on public.workspace_memberships for delete to authenticated
  using (user_id = (select auth.uid()) or (private.is_ws_admin(workspace_id) and private.rank(role) < private.rank(private.ws_role(workspace_id))));

create policy teams_select on public.teams for select to authenticated using (private.is_ws_member(workspace_id));
create policy teams_insert on public.teams for insert to authenticated with check (private.is_ws_admin(workspace_id));
create policy teams_update on public.teams for update to authenticated using (private.is_ws_admin(workspace_id)) with check (private.is_ws_admin(workspace_id));
create policy teams_delete on public.teams for delete to authenticated using (private.is_ws_admin(workspace_id) and not is_default);

create policy statuses_select on public.statuses for select to authenticated using (private.is_ws_member(private.team_ws(team_id)));
create policy statuses_insert on public.statuses for insert to authenticated with check (private.is_ws_admin(private.team_ws(team_id)));
create policy statuses_update on public.statuses for update to authenticated using (private.is_ws_admin(private.team_ws(team_id))) with check (private.is_ws_admin(private.team_ws(team_id)));
create policy statuses_delete on public.statuses for delete to authenticated using (private.is_ws_admin(private.team_ws(team_id)));

create policy labels_select on public.labels for select to authenticated using (private.is_ws_member(workspace_id));
create policy labels_insert on public.labels for insert to authenticated with check (private.is_ws_member(workspace_id));
create policy labels_update on public.labels for update to authenticated using (private.is_ws_admin(workspace_id)) with check (private.is_ws_admin(workspace_id));
create policy labels_delete on public.labels for delete to authenticated using (private.is_ws_admin(workspace_id));

create policy projects_select on public.projects for select to authenticated using (private.is_ws_member(workspace_id));
create policy projects_insert on public.projects for insert to authenticated with check (private.is_ws_member(workspace_id));
create policy projects_update on public.projects for update to authenticated
  using (private.is_ws_admin(workspace_id) or lead_id = (select auth.uid()))
  with check (private.is_ws_member(workspace_id));
create policy projects_delete on public.projects for delete to authenticated using (private.is_ws_admin(workspace_id));

create policy project_memberships_select on public.project_memberships for select to authenticated using (private.is_ws_member(private.project_ws(project_id)));
create policy project_memberships_insert on public.project_memberships for insert to authenticated
  with check (private.is_ws_admin(private.project_ws(project_id)) or private.project_lead(project_id) = (select auth.uid()) or user_id = (select auth.uid()));
create policy project_memberships_delete on public.project_memberships for delete to authenticated
  using (private.is_ws_admin(private.project_ws(project_id)) or private.project_lead(project_id) = (select auth.uid()) or user_id = (select auth.uid()));

create policy project_updates_select on public.project_updates for select to authenticated using (private.is_ws_member(workspace_id));
create policy project_updates_insert on public.project_updates for insert to authenticated with check (private.is_ws_member(private.project_ws(project_id)));
create policy project_updates_delete on public.project_updates for delete to authenticated using (author_id = (select auth.uid()) or private.is_ws_admin(workspace_id));

create policy work_items_select on public.work_items for select to authenticated using (private.is_ws_member(workspace_id));
create policy work_items_insert on public.work_items for insert to authenticated with check (private.is_ws_member(private.project_ws(project_id)));
create policy work_items_update on public.work_items for update to authenticated
  using (private.is_ws_member(workspace_id)) with check (private.is_ws_member(workspace_id) and private.project_ws(project_id) = workspace_id);
create policy work_items_delete on public.work_items for delete to authenticated
  using (private.is_ws_admin(workspace_id) or created_by = (select auth.uid()));

create policy work_item_labels_select on public.work_item_labels for select to authenticated using (private.is_ws_member(private.item_ws(work_item_id)));
create policy work_item_labels_insert on public.work_item_labels for insert to authenticated
  with check (private.is_ws_member(private.item_ws(work_item_id)) and (select workspace_id from public.labels where id = label_id) = private.item_ws(work_item_id));
create policy work_item_labels_delete on public.work_item_labels for delete to authenticated using (private.is_ws_member(private.item_ws(work_item_id)));

create policy comments_select on public.comments for select to authenticated using (private.is_ws_member(workspace_id));
create policy comments_insert on public.comments for insert to authenticated with check (private.is_ws_member(private.item_ws(work_item_id)));
create policy comments_update on public.comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = (select auth.uid()) or private.is_ws_admin(workspace_id));

create policy activity_select on public.activity_log for select to authenticated using (private.is_ws_member(workspace_id));

create policy notifications_select on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy invitations_select on public.invitations for select to authenticated using (private.is_ws_admin(workspace_id));
create policy invitations_update on public.invitations for update to authenticated
  using (private.is_ws_admin(workspace_id)) with check (private.is_ws_admin(workspace_id) and status in ('revoked', 'pending'));
create policy invitations_delete on public.invitations for delete to authenticated using (private.is_ws_admin(workspace_id));

-- ---------------------------------------------------------------------
-- 7) realtime
-- ---------------------------------------------------------------------
alter table public.work_items replica identity full;
alter table public.comments replica identity full;
alter table public.projects replica identity full;
alter publication supabase_realtime add table public.work_items, public.work_item_labels, public.comments, public.projects, public.notifications, public.activity_log, public.workspace_memberships, public.invitations;
