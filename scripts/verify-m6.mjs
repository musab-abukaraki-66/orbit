#!/usr/bin/env node
// M6 verification: Team & user management — invitations, RLS role hierarchy,
// accept RPC, last-owner protection, HTTP smoke tests, and cross-tenant
// isolation. Requires `npm run build && npm run start` on :3111 + local Supabase.
// Usage: node scripts/verify-m6.mjs
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { randomUUID } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

function loadEnvFile() {
  const path = join(ROOT, ".env.local")
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const [, key, raw] = m
    let value = raw.trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}
loadEnvFile()

const env = {
  url: process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
  anon: process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  service: process.env.SUPABASE_SERVICE_ROLE_KEY,
  app: process.env.APP_URL ?? "http://127.0.0.1:3111",
}

if (!env.anon || !env.service) {
  console.error("Missing SUPABASE env vars (anon key + service role key).")
  process.exit(1)
}

const adminClient = createClient(env.url, env.service, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let passed = 0
let failed = 0
const failures = []

function check(name, cond, detail) {
  if (cond) {
    passed++
    console.log(`  PASS  ${name}`)
  } else {
    failed++
    failures.push({ name, detail })
    console.log(
      `  FAIL  ${name} ${detail ? "-- " + JSON.stringify(detail).slice(0, 400) : ""}`,
    )
  }
}
function section(name) {
  console.log(`\n=== ${name} ===`)
}

// RLS-filtered writes resolve to an empty result set rather than an error;
// count rows (or error) uniformly.
function numRows(result) {
  if (result.error) return -1
  return (result.data ?? []).length
}

// A mutation is "blocked" by RLS when it returns an error (RLS policy check)
// or affects zero rows.
function isBlocked(result) {
  return result.error !== null || (result.data ?? []).length === 0
}

async function makeAuthClient(email) {
  const cookieStore = new Map()
  const client = createServerClient(env.url, env.anon, {
    cookies: {
      getAll: () =>
        [...cookieStore.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet) =>
        cookiesToSet.forEach(({ name, value }) => cookieStore.set(name, value)),
    },
  })
  const { error } = await client.auth.signInWithPassword({
    email,
    password: "TestPass123!",
  })
  if (error) throw new Error(`signin ${email}: ${error.message}`)
  return {
    client,
    cookieHeader: () =>
      [...cookieStore.entries()].map(([n, v]) => `${n}=${v}`).join("; "),
  }
}

async function signUpUser(tag) {
  const email = `m6-${tag}-${randomUUID().slice(0, 8)}@test.local`
  const { data, error } = await adminClient.auth.signUp({
    email,
    password: "TestPass123!",
    options: { data: { full_name: `Test ${tag} ${randomUUID().slice(0, 4)}` } },
  })
  if (error || !data?.user) throw new Error(`signUp ${tag}: ${error?.message}`)
  return { email, user: data.user }
}

async function httpGet(path, cookie) {
  const headers = {}
  if (cookie) headers.cookie = cookie
  const res = await fetch(env.app + path, { headers, redirect: "manual" })
  return res
}

try {
  section("SETUP users + team")
  const owner = await signUpUser("owner")
  const admin = await signUpUser("admin")
  const member = await signUpUser("member")
  const outsider = await signUpUser("outsider")
  const invitee = await signUpUser("invitee")

  const cOwner = await makeAuthClient(owner.email)
  const cAdmin = await makeAuthClient(admin.email)
  const cMember = await makeAuthClient(member.email)
  const cOutsider = await makeAuthClient(outsider.email)
  const cInvitee = await makeAuthClient(invitee.email)

  const team = await cOwner.client
    .from("teams")
    .insert({ name: "Team Z", slug: `team-z-${randomUUID().slice(0, 8)}` })
    .select("id, name")
    .single()
  if (team.error) throw new Error("team: " + team.error.message)
  const teamId = team.data.id

  // Owner promotes admin + member via direct membership writes (owners are
  // only ever created via createTeam, and role assignment is what M6 adds).
  const addAdmin = await cOwner.client
    .from("team_memberships")
    .insert({ team_id: teamId, user_id: admin.user.id, role: "admin" })
  if (addAdmin.error) throw new Error("add admin: " + addAdmin.error.message)
  const addMember = await cOwner.client
    .from("team_memberships")
    .insert({ team_id: teamId, user_id: member.user.id, role: "member" })
  if (addMember.error) throw new Error("add member: " + addMember.error.message)

  section("INVITATION RLS: owner/admin can create, member cannot")
  const invByOwner = await cOwner.client
    .from("invitations")
    .insert({ team_id: teamId, email: `${invitee.email}`, role: "member", invited_by: owner.user.id })
    .select("id, token, email, role")
    .single()
  check("owner can invite a member", !invByOwner.error && invByOwner.data?.token, invByOwner.error)

  const invAdminByOwner = await cOwner.client
    .from("invitations")
    .insert({ team_id: teamId, email: `admin-${invitee.email}`, role: "admin", invited_by: owner.user.id })
    .select("id, token, role")
    .single()
  check("owner can invite an admin", !invAdminByOwner.error, invAdminByOwner.error)

  const invByAdminMember = await cAdmin.client
    .from("invitations")
    .insert({ team_id: teamId, email: `x-${invitee.email}`, role: "member", invited_by: admin.user.id })
    .select("id, token")
    .single()
  check("admin can invite a member", !invByAdminMember.error, invByAdminMember.error)

  const invByAdminOwner = await cAdmin.client
    .from("invitations")
    .insert({ team_id: teamId, email: `y-${invitee.email}`, role: "admin", invited_by: admin.user.id })
    .select("id, token")
    .single()
  check(
    "admin CANNOT invite an admin (RLS WITH CHECK)",
    invByAdminOwner.error !== null,
    { err: invByAdminOwner.error?.message },
  )

  const invByMember = await cMember.client
    .from("invitations")
    .insert({ team_id: teamId, email: `z-${invitee.email}`, role: "member", invited_by: member.user.id })
    .select("id, token")
  check("member CANNOT create invitations (RLS)", !invByMember.data || invByMember.data.length === 0, invByMember.error)

  const invByOutsider = await cOutsider.client
    .from("invitations")
    .insert({ team_id: teamId, email: `w-${invitee.email}`, role: "member", invited_by: outsider.user.id })
    .select("id, token")
  check("outsider CANNOT create invitations (RLS)", !invByOutsider.data || invByOutsider.data.length === 0, invByOutsider.error)

  section("INVITATION VISIBILITY (zero access for members)")
  const seenMember = await cMember.client.from("invitations").select("id, email")
  check("member cannot SELECT invitations", !seenMember.data || seenMember.data.length === 0, seenMember.data)
  const seenOutsider = await cOutsider.client.from("invitations").select("id, email")
  check("outsider cannot SELECT invitations", !seenOutsider.data || seenOutsider.data.length === 0, seenOutsider.data)

  section("INVITATION MUTATIONS (UPDATE: owner-admin only)")
  const updMember = await cMember.client
    .from("invitations")
    .update({ status: "revoked" })
    .eq("team_id", teamId)
  check("member cannot UPDATE invitations", numRows(updMember) === 0, updMember.error ?? updMember.data)
  const updOutsider = await cOutsider.client
    .from("invitations")
    .update({ status: "revoked" })
    .eq("team_id", teamId)
  check("outsider cannot UPDATE invitations", numRows(updOutsider) === 0, updOutsider.error ?? updOutsider.data)

  section("MEMBERSHIP MUTATIONS (owner-admin only)")
  const mutMember = await cMember.client
    .from("team_memberships")
    .update({ role: "admin" })
    .eq("team_id", teamId)
  check("member cannot UPDATE memberships", numRows(mutMember) === 0, mutMember.error ?? mutMember.data)
  const delMember = await cMember.client
    .from("team_memberships")
    .delete()
    .eq("team_id", teamId)
  check("member cannot DELETE memberships", numRows(delMember) === 0, delMember.error ?? delMember.data)

  section("DUPLICATE PENDING INVITE (per team+email)")
  const dupEmail = `dup-${invitee.email}`
  const firstInvite = await cOwner.client
    .from("invitations")
    .insert({ team_id: teamId, email: dupEmail, role: "member", invited_by: owner.user.id })
    .select("id, token")
    .single()
  check("first pending invite created", !firstInvite.error, firstInvite.error)

  const dup = await cOwner.client
    .from("invitations")
    .insert({ team_id: teamId, email: dupEmail, role: "admin", invited_by: owner.user.id })
    .select("id, token")
    .single()
  check(
    "duplicate pending invite rejected (unique index)",
    dup.error !== null,
    dup.error?.code,
  )

  section("ACCEPT: valid (email match) -> membership")
  const acceptOk = await cInvitee.client.rpc("accept_invitation", {
    p_token: invByOwner.data.token,
  })
  check("valid acceptance returns team_id", acceptOk.data === teamId, { data: acceptOk.data, err: acceptOk.error })
  const membership = await cInvitee.client
    .from("team_memberships")
    .select("team_id, role")
    .eq("user_id", invitee.user.id)
    .eq("team_id", teamId)
    .maybeSingle()
  check("accepted invite creates membership (role from invite)", membership.data?.role === "member", membership.data)

  section("ACCEPT: reuse / wrong email / unknown")
  const acceptReuse = await cInvitee.client.rpc("accept_invitation", {
    p_token: invByOwner.data.token,
  })
  check("already-used invitation rejected", acceptReuse.error !== null, acceptReuse.error?.message)

  const acceptWrong = await cAdmin.client.rpc("accept_invitation", {
    p_token: invAdminByOwner.data.token,
  })
  check("wrong-email acceptance rejected", acceptWrong.error !== null && /email_mismatch/i.test(acceptWrong.error?.message ?? ""), acceptWrong.error?.message)

  const acceptUnknown = await cInvitee.client.rpc("accept_invitation", {
    p_token: "deadbeefdeadbeef",
  })
  check("unknown token rejected", acceptUnknown.error !== null, acceptUnknown.error?.message)

  section("ACCEPT: expired")
  const expired = await cOwner.client
    .from("invitations")
    .insert({ team_id: teamId, email: `${invitee.email}`, role: "member", invited_by: owner.user.id, expires_at: new Date(Date.now() - 60000).toISOString() })
    .select("id, token")
    .single()
  if (expired.error) throw new Error("expired invite: " + expired.error.message)
  const acceptExpired = await cInvitee.client.rpc("accept_invitation", {
    p_token: expired.data.token,
  })
  check(
    "expired invitation rejected (returns NULL, no membership)",
    acceptExpired.error === null && acceptExpired.data === null,
    { data: acceptExpired.data, err: acceptExpired.error?.message },
  )
  const expStatus = await cOwner.client.from("invitations").select("status").eq("id", expired.data.id).single()
  check("expired invite marked 'expired'", expStatus.data?.status === "expired", expStatus.data)

  section("REVOKE (admin can manage, member cannot see)")
  const target = await cOwner.client
    .from("invitations")
    .insert({ team_id: teamId, email: `rev-${invitee.email}`, role: "member", invited_by: owner.user.id })
    .select("id, token")
    .single()
  const revoke = await cAdmin.client
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", target.data.id)
    .select("id, status")
    .single()
  check("admin can revoke a pending invitation", revoke.data?.status === "revoked", revoke.error ?? revoke.data)

  const acceptRevoked = await cInvitee.client.rpc("accept_invitation", {
    p_token: target.data.token,
  })
  check(
    "accepting a revoked token is rejected",
    acceptRevoked.error !== null,
    acceptRevoked.error?.message,
  )

  section("LAST-OWNER PROTECTION (database trigger, unbypassable)")
  // Owner is admin, so RLS permits the mutation; ONLY the BEFORE trigger can
  // reject deleting/demoting a team's last owner.
  const ownerMembership = await cOwner.client
    .from("team_memberships")
    .select("team_id, user_id, role")
    .eq("team_id", teamId)
    .eq("user_id", owner.user.id)
    .single()
  check(
    "owner membership present for trigger test",
    ownerMembership.data?.role === "owner",
    ownerMembership.data,
  )

  const delLast = await cOwner.client
    .from("team_memberships")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", owner.user.id)
  check(
    "cannot DELETE the last owner (trigger)",
    delLast.error !== null && /cannot_remove_last_owner/.test(delLast.error?.message ?? ""),
    delLast.error?.message,
  )

  const demoteLast = await cOwner.client
    .from("team_memberships")
    .update({ role: "member" })
    .eq("team_id", teamId)
    .eq("user_id", owner.user.id)
  check(
    "cannot DEMOTE the last owner (trigger)",
    demoteLast.error !== null && /cannot_demote_last_owner/.test(demoteLast.error?.message ?? ""),
    demoteLast.error?.message,
  )

  const ownerRow = await cOwner.client
    .from("team_memberships")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", owner.user.id)
    .single()
  check("owner role intact after attempted removal", ownerRow.data?.role === "owner", ownerRow.data)

  section("HTTP SMOKE")
  const teamPage = await httpGet("/app/team")
  check("GET /app/team unauth => 307 /login", teamPage.status === 307 && teamPage.headers.get("location")?.startsWith("/login"), { status: teamPage.status, loc: teamPage.headers.get("location") })
  const authed = await httpGet("/app/team", cOwner.cookieHeader())
  check("GET /app/team (authenticated) => 200", authed.status === 200, { status: authed.status })

  const inviteAuth = await httpGet(`/invite/${invByOwner.data.token}`, cInvitee.cookieHeader())
  check("GET /invite/[token] (authenticated, used) => 200", inviteAuth.status === 200, { status: inviteAuth.status })

  // A fresh pending invite for the invitee's own email renders the ready state.
  const fresh = await cOwner.client
    .from("invitations")
    .insert({ team_id: teamId, email: `${invitee.email}`, role: "member", invited_by: owner.user.id })
    .select("id, token")
    .single()
  const readyInvite = await httpGet(`/invite/${fresh.data.token}`, cInvitee.cookieHeader())
  check("GET /invite/[token] (pending, matching) => 200", readyInvite.status === 200, { status: readyInvite.status })

  const invalidInvite = await httpGet(`/invite/not-a-valid-token-aaaaaaaaaaaaaaaa`, cInvitee.cookieHeader())
  check("GET /invite/[invalid] => 200 (renders error, not 500)", invalidInvite.status === 200, { status: invalidInvite.status })

  section("CROSS-TENANT ISOLATION")
  // A second team owned by the outsider. The invitee is only a member of
  // teamId, so they must not see or mutate the other team's invitations or
  // memberships.
  const teamB = await cOutsider.client
    .from("teams")
    .insert({ name: "Team B", slug: `team-b-${randomUUID().slice(0, 8)}` })
    .select("id")
    .single()
  if (teamB.error) throw new Error("teamB: " + teamB.error.message)
  const teamBInvitation = await cOutsider.client
    .from("invitations")
    .insert({ team_id: teamB.data.id, email: `b-${outsider.email}`, role: "member", invited_by: outsider.user.id })
    .select("id")
    .single()
  if (teamBInvitation.error) throw new Error("teamB invite: " + teamBInvitation.error.message)

  const otherSeesTeamB = await cInvitee.client.from("invitations").select("id, team_id")
  check(
    "member of team A cannot SELECT team B invitations",
    (otherSeesTeamB.data ?? []).every((r) => r.team_id === teamId),
    otherSeesTeamB.data,
  )
  const otherInsTeamB = await cInvitee.client
    .from("team_memberships")
    .insert({ team_id: teamB.data.id, user_id: invitee.user.id, role: "admin" })
    .select("team_id, user_id")
  check("member of team A cannot INSERT into team B memberships", isBlocked(otherInsTeamB), otherInsTeamB.error ?? otherInsTeamB.data)

  const rosterB = await cInvitee.client.from("team_memberships").select("team_id")
  check(
    "team A member cannot SELECT team B's roster",
    (rosterB.data ?? []).every((r) => r.team_id === teamId),
    rosterB.data,
  )
} catch (e) {
  failed++
  failures.push({ name: "harness", detail: e.message })
}

console.log(`\n======== SUMMARY ========`)
console.log(`PASSED: ${passed}`)
console.log(`FAILED: ${failed}`)
if (failures.length) {
  console.log("Failures:")
  for (const f of failures) console.log("  -", f.name, JSON.stringify(f.detail)?.slice(0, 400))
}
process.exit(failed ? 1 : 0)