-- =====================================================================
-- Orbit — M6 follow-up: persist the 'expired' status on failed accept
--
-- accept_invitation's expiry branch previously did:
--
--   update public.invitations set status = 'expired' where id = v_invite.id;
--   raise exception ... 'invitation_expired';
--
-- PostgREST runs each RPC call inside a single implicit transaction, so the
-- RAISE aborted it and rolled back the UPDATE — the invitation stayed
-- 'pending' forever (verified by verify-m6.mjs: status was still 'pending'
-- after an expired accept).
--
-- Fix: the expiry branch now commits the status change and returns NULL
-- instead of raising. The app treats a NULL result as "expired" (no team was
-- joined, no cookie set). All other failure branches (invalid/used token,
-- email mismatch) still RAISE — they carry no state change to persist.
--
-- The function signature is unchanged, so no client type regeneration is
-- required.
-- =====================================================================

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
    return null;
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
