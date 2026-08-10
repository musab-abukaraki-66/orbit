-- =====================================================================
-- Orbit — M3: team creation RLS fix
--
-- PostgreSQL evaluates SELECT policies on rows returned by
-- `INSERT ... RETURNING` BEFORE AFTER INSERT triggers fire. The creator's
-- team_memberships row is only inserted by the AFTER INSERT trigger, so a
-- creator using `insert(...).select()` (the standard supabase-js pattern)
-- failed `teams_select`, which requires membership:
--
--   ERROR: new row violates row-level security policy for table "teams"
--
-- Fix without touching the M2 migration:
--   1. Force `created_by` to the current user on insert (also closes the
--      "spoof a team onto a victim" vector).
--   2. Allow `teams_select` to admit the row's creator in addition to
--      members. The creator is made an `owner` member right after the row
--      is inserted, so this only widens visibility for the brief INSERT
--      window; cross-tenant reads stay blocked.
-- =====================================================================

-- Force created_by to the current user (skipped when unauthenticated,
-- e.g. seeding via service_role where auth.uid() is null).
create or replace function private.set_team_created_by()
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
    new.created_by := v_uid;
  end if;
  return new;
end;
$$;

create trigger teams_before_insert_set_created_by
  before insert on public.teams
  for each row execute function private.set_team_created_by();

drop policy "teams_select" on public.teams;
create policy "teams_select" on public.teams
  for select to authenticated
  using (
    private.is_team_member(id)
    or created_by = (select auth.uid())
  );
