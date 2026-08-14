-- =====================================================================
-- Orbit — M5.1: Labels + due dates
--
-- Post-M5 enhancements layered on the M5 Kanban model:
--
--   1. labels            Team-scoped label pool shared across a team's
--                        boards/workspaces. Unique by (team_id, lower(name))
--                        so each team owns its own label set.
--   2. task_labels       M:N junction between tasks and labels. Links may
--                        only reference a label from the task's OWN team.
--   3. tasks.due_date    Nullable due date (day granularity) on tasks.
--
-- RLS mirrors the existing tasks/columns pattern: SECURITY DEFINER helpers
-- in the `private` schema, team-membership checks, and no weakening of any
-- existing policy. Labels + links are only visible/editable by members of
-- the owning team, and link rows can never escape a task's team.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) tasks.due_date
-- ---------------------------------------------------------------------

alter table public.tasks add column due_date date;

-- ---------------------------------------------------------------------
-- 2) labels (team-scoped label pool)
-- ---------------------------------------------------------------------

create table public.labels (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  name       text not null,
  color      text not null default 'slate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index labels_team_name_key on public.labels (team_id, lower(name));
create index labels_team_id_idx on public.labels (team_id);

create trigger labels_set_updated_at
  before update on public.labels
  for each row execute function private.set_updated_at();

alter table public.labels enable row level security;

-- ---------------------------------------------------------------------
-- 3) task_labels (M:N junction)
-- ---------------------------------------------------------------------

create table public.task_labels (
  task_id    uuid not null references public.tasks (id) on delete cascade,
  label_id   uuid not null references public.labels (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, label_id)
);

create index task_labels_label_id_idx on public.task_labels (label_id);

alter table public.task_labels enable row level security;

-- ---------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, mirroring the existing private.* pattern)
-- ---------------------------------------------------------------------

-- Resolve the parent team of a task through board -> workspace.
create or replace function private.get_task_team_id(p_task_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select private.get_workspace_team_id(
           private.get_board_workspace_id(t.board_id)
         )
  from public.tasks t
  where t.id = p_task_id
$$;

-- Resolve the parent team of a label.
create or replace function private.get_label_team_id(p_label_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select team_id
  from public.labels
  where id = p_label_id
$$;

-- ---------------------------------------------------------------------
-- RLS: labels
-- ---------------------------------------------------------------------

create policy "labels_select" on public.labels
  for select to authenticated
  using (private.is_team_member(team_id));

create policy "labels_insert" on public.labels
  for insert to authenticated
  with check (private.is_team_member(team_id));

create policy "labels_update" on public.labels
  for update to authenticated
  using (private.is_team_member(team_id))
  with check (private.is_team_member(team_id));

create policy "labels_delete" on public.labels
  for delete to authenticated
  using (private.is_team_member(team_id));

-- ---------------------------------------------------------------------
-- RLS: task_labels (writes may only link a task to a SAME-TEAM label)
-- ---------------------------------------------------------------------

create policy "task_labels_select" on public.task_labels
  for select to authenticated
  using (private.is_team_member(private.get_task_team_id(task_id)));

create policy "task_labels_insert" on public.task_labels
  for insert to authenticated
  with check (
    private.is_team_member(private.get_task_team_id(task_id))
    and private.get_label_team_id(label_id) = private.get_task_team_id(task_id)
  );

create policy "task_labels_update" on public.task_labels
  for update to authenticated
  using (
    private.is_team_member(private.get_task_team_id(task_id))
    and private.get_label_team_id(label_id) = private.get_task_team_id(task_id)
  )
  with check (
    private.is_team_member(private.get_task_team_id(task_id))
    and private.get_label_team_id(label_id) = private.get_task_team_id(task_id)
  );

create policy "task_labels_delete" on public.task_labels
  for delete to authenticated
  using (
    private.is_team_member(private.get_task_team_id(task_id))
    and private.get_label_team_id(label_id) = private.get_task_team_id(task_id)
  );

-- ---------------------------------------------------------------------
-- Grants (explicit: new tables are NOT auto-exposed to the Data API)
-- ---------------------------------------------------------------------

grant all on public.labels to anon, authenticated, service_role;
grant all on public.task_labels to anon, authenticated, service_role;