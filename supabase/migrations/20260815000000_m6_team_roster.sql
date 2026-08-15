-- =====================================================================
-- Orbit — M6 follow-up: team roster visibility
--
-- The Team page shows every member of the current team to every member
-- (plus role badges), with management controls gated by role. The existing
-- team_memberships_select policy only let a user see their own membership
-- row (or an admin see all), which would render the roster invisible to
-- plain members. Relax just the SELECT policy to let any team member view
-- the team's own membership list. INSERT/UPDATE/DELETE stay admin-only, so
-- this does not widen who can mutate memberships.
--
-- NOTE: cross-team isolation is preserved — is_team_member(team_id) only
-- returns true for teams the caller actually belongs to, so a member of one
-- team cannot read another team's roster.
-- =====================================================================

drop policy "team_memberships_select" on public.team_memberships;

create policy "team_memberships_select" on public.team_memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_team_member(team_id)
  );