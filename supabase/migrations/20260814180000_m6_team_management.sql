-- =====================================================================
-- Orbit — M6: Team & user management
--
-- Adds a custom invitations table (not Supabase's inviteUserByEmail admin
-- API) so invites carry a role at invite time, expire, and can be revoked.
-- Acceptance is a single narrowly-scoped SECURITY DEFINER RPC that creates
-- the membership (the accepting user is not a team member yet, so normal
-- RLS would block it — this is the ONE deliberate bypass).
--
-- RLS mirrors the established pattern from M2: SECURITY DEFINER helpers in
-- the `private` schema, team-membership checks, and no weakening of any
-- existing policy. Only owner/admin members may touch invitations; plain
-- members get zero access. Role hierarchy is enforced inside the INSERT
-- policy's WITH CHECK (admin may only create member-role invites).
--
-- Last-owner protection is enforced at the database layer with a BEFORE
-- UPDATE OR DELETE trigger on team_memberships: a team can never be left
-- with zero owners, and this cannot be bypassed by calling table mutations
-- directly.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) invitations table
-- ---------------------------------------------------------------------

create table public.invitations (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  email      text not null,
  role       text not null check (role in ('admin', 'member')),
  token      text not null unique default encode(gen_random_bytes(32), 'hex'),
  status     text not null default 'pending'
             check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);

-- One pending invite per (team, email). Past invitations (revoked, accepted,
-- expired) don't block re-inviting the same person.
create unique index invitations_pending_unique
  on public.invitations (team_id, lower(email))
  where status = 'pending';

create index invitations_team_id_idx on public.invitations (team_id);
create index invitations_token_idx on public.invitations (token);

alter table public.invitations enable row level security;

-- ---------------------------------------------------------------------
-- 2) RLS: invitations
-- ---------------------------------------------------------------------

-- SELECT: owner/admin members of team_id only.
create policy "invitations_select" on public.invitations
  for select to authenticated
  using (private.is_team_admin(team_id));

-- INSERT: owner/admin members of team_id only. Role hierarchy enforced in
-- the WITH CHECK: role='admin' additionally requires an owner (an admin
-- cannot create admin-role invites; only member-role invites).
create policy "invitations_insert" on public.invitations
  for insert to authenticated
  with check (
    private.is_team_admin(team_id)
    and (
      role = 'member'
      or private.is_team_owner(team_id)
    )
  );

-- UPDATE (used for revoke): owner/admin members of team_id only.
create policy "invitations_update" on public.invitations
  for update to authenticated
  using (private.is_team_admin(team_id))
  with check (private.is_team_admin(team_id));

-- ---------------------------------------------------------------------
-- 3) SECURITY DEFINER accept function
--
-- The accepting user is not yet a team member, so this function must run
-- with elevated privileges to read the invitation and write the membership.
-- Security controls are narrow and explicit: the token itself is the bearer
-- secret (32 random bytes), the invite is locked with FOR UPDATE so two
-- concurrent accepts can't both succeed, expiry/status/email are all
-- validated, and the membership insert uses ON CONFLICT DO NOTHING so a
-- user who is somehow already a member cannot be duplicated.
-- ---------------------------------------------------------------------

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.invitations%rowtype;
  v_user_email text;
begin
  select email into v_user_email from auth.users where id = (select auth.uid());

  select * into v_invite from public.invitations
    where token = p_token and status = 'pending'
    for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'invalid_or_used_invitation';
  end if;

  if v_invite.expires_at < now() then
    update public.invitations set status = 'expired' where id = v_invite.id;
    raise exception using errcode = 'P0001', message = 'invitation_expired';
  end if;

  if lower(v_invite.email) <> lower(coalesce(v_user_email, '')) then
    raise exception using errcode = 'P0001', message = 'email_mismatch';
  end if;

  insert into public.team_memberships (team_id, user_id, role)
    values (v_invite.team_id, (select auth.uid()), v_invite.role)
    on conflict (team_id, user_id) do nothing;

  update public.invitations set status = 'accepted', accepted_at = now()
    where id = v_invite.id;

  return v_invite.team_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 4) Narrow read helper for the /invite/[token] page
--
-- Returns limited, non-sensitive metadata for a token so the accept page
-- can render the team name and a specific status/error before the user
-- confirms. The token is the bearer secret; no data beyond the invite row
-- is exposed. Authored as SECURITY DEFINER but deliberately does NOT take
-- any action — it cannot create memberships.
-- ---------------------------------------------------------------------

create or replace function public.get_invitation(p_token text)
returns table (
  team_id     uuid,
  team_name   text,
  email       text,
  role        text,
  status      text,
  expires_at  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select inv.team_id, t.name, inv.email, inv.role, inv.status, inv.expires_at
  from public.invitations inv
  join public.teams t on t.id = inv.team_id
  where inv.token = p_token
$$;

-- ---------------------------------------------------------------------
-- 5) Last-owner protection (database layer, unbypassable)
--
-- Fires on UPDATE/DELETE of a team_memberships row. If the changed/dropped
-- row was an owner and no other owner remains in the team, the operation is
-- rejected. Runs as SECURITY DEFINER so the owner count is not subject to
-- the caller's own RLS horizon.
-- ---------------------------------------------------------------------

create or replace function private.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_other_owners bigint;
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' then
      select count(*) into v_other_owners
      from public.team_memberships
      where team_id = old.team_id
        and user_id <> old.user_id
        and role = 'owner';
      if v_other_owners = 0 then
        raise exception using errcode = 'P0001', message = 'cannot_remove_last_owner';
      end if;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if old.role = 'owner' and new.role <> 'owner' then
      select count(*) into v_other_owners
      from public.team_memberships
      where team_id = old.team_id
        and user_id <> old.user_id
        and role = 'owner';
      if v_other_owners = 0 then
        raise exception using errcode = 'P0001', message = 'cannot_demote_last_owner';
      end if;
    end if;
    return new;
  end if;
  return null;
end;
$$;

create trigger team_memberships_prevent_last_owner_removal
  before update or delete on public.team_memberships
  for each row execute function private.prevent_last_owner_removal();

-- ---------------------------------------------------------------------
-- Grants (explicit; new tables/functions are not auto-exposed)
-- ---------------------------------------------------------------------

grant all on public.invitations to anon, authenticated, service_role;
grant execute on function public.accept_invitation(text) to anon, authenticated, service_role;
grant execute on function public.get_invitation(text) to anon, authenticated, service_role;