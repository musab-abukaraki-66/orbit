"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { ACTIVE_TEAM_COOKIE } from "@/lib/auth/session"
import { sendInvitationEmail } from "@/lib/resend/invitation"
import { getSiteOrigin } from "@/lib/site-url"

export type TeamRole = "owner" | "admin" | "member"

export type TeamActionResult = {
  ok: boolean
  message?: string
  teamId?: string
}

export type MemberPayload = {
  userId: string
  fullName: string | null
  email: string | null
  avatarUrl: string | null
  role: TeamRole
  createdAt: string
}

export type InvitationPayload = {
  id: string
  email: string
  role: "admin" | "member"
  status: string
  invitedBy: string | null
  expiresAt: string
  createdAt: string
}

export type MembersListResult = {
  ok: boolean
  message?: string
  members?: MemberPayload[]
}

export type InvitationsListResult = {
  ok: boolean
  message?: string
  invitations?: InvitationPayload[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ROLE_RANK: Record<TeamRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
}

async function getCurrentUserOrRedirect() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return { supabase, user }
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

// Current user's role in a team, or null if they aren't a member.
async function getMyRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  userId: string,
): Promise<TeamRole | null> {
  const { data } = await supabase
    .from("team_memberships")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle()

  return data ? (data.role as TeamRole) : null
}

export async function listMembers(
  teamId: string,
): Promise<MembersListResult> {
  if (!isUuid(teamId)) {
    return { ok: false, message: "Invalid team." }
  }

  const { supabase } = await getCurrentUserOrRedirect()

  const { data: memberships, error } = await supabase
    .from("team_memberships")
    .select("user_id, role, created_at")
    .eq("team_id", teamId)

  if (error) {
    return { ok: false, message: error.message }
  }

  const userIds = (memberships ?? []).map((row) => row.user_id)
  const members: MemberPayload[] = (memberships ?? []).map((row) => ({
    userId: row.user_id,
    fullName: null,
    email: null,
    avatarUrl: null,
    role: row.role as TeamRole,
    createdAt: row.created_at,
  }))

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", userIds)

    if (!profilesError) {
      const byId = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile]),
      )
      for (const member of members) {
        const profile = byId.get(member.userId)
        if (profile) {
          member.fullName = profile.full_name
          member.email = profile.email
          member.avatarUrl = profile.avatar_url
        }
      }
    }
  }

  // Owner first, then admins, then members; alphabetical within each group.
  members.sort((a, b) => {
    const rankDiff = ROLE_RANK[b.role] - ROLE_RANK[a.role]
    if (rankDiff !== 0) return rankDiff
    const aName = (a.fullName ?? a.email ?? "").toLowerCase()
    const bName = (b.fullName ?? b.email ?? "").toLowerCase()
    return aName.localeCompare(bName)
  })

  return { ok: true, members }
}

export async function listInvitations(
  teamId: string,
): Promise<InvitationsListResult> {
  if (!isUuid(teamId)) {
    return { ok: false, message: "Invalid team." }
  }

  const { supabase } = await getCurrentUserOrRedirect()

  const { data, error } = await supabase
    .from("invitations")
    .select("id, email, role, status, invited_by, expires_at, created_at")
    .eq("team_id", teamId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error) {
    return { ok: false, message: error.message }
  }

  const inviterIds = (data ?? []).map((row) => row.invited_by)
  const inviterNames = new Map<string, string>()

  if (inviterIds.length > 0) {
    const { data: inviters, error: invitersError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", inviterIds)

    if (!invitersError) {
      for (const profile of inviters ?? []) {
        inviterNames.set(profile.id, profile.full_name ?? "")
      }
    }
  }

  return {
    ok: true,
    invitations: (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role as "admin" | "member",
      status: row.status,
      invitedBy: inviterNames.get(row.invited_by)?.trim() || null,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    })),
  }
}

export async function createInvitation(
  teamId: string,
  email: string,
  role: string,
): Promise<TeamActionResult> {
  const cleanEmail = String(email ?? "").trim().toLowerCase()
  const cleanRole = String(role ?? "").trim()

  if (!isUuid(teamId)) {
    return { ok: false, message: "Invalid team." }
  }
  if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
    return { ok: false, message: "Please enter a valid email address." }
  }
  if (cleanRole !== "admin" && cleanRole !== "member") {
    return { ok: false, message: "Invalid role." }
  }

  const { supabase, user } = await getCurrentUserOrRedirect()

  const myRole = await getMyRole(supabase, teamId, user.id)

  // Only owners and admins can invite. (RLS enforces this too; we check first
  // for a clear message.)
  if (myRole === null || myRole === "member") {
    return {
      ok: false,
      message: "You need admin access to invite members to this team.",
    }
  }

  // Owner can invite admins or members; admins can only invite members.
  if (cleanRole === "admin" && myRole !== "owner") {
    return {
      ok: false,
      message: "Only owners can invite admins.",
    }
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .maybeSingle()

  if (!team) {
    return { ok: false, message: "Team not found." }
  }

  // Already a member? Profiles mirror auth.users (email is stored lowercase),
  // so a matching row means this exact account is on the team already.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", cleanEmail)
    .maybeSingle()

  if (existingProfile) {
    const { data: existingMember } = await supabase
      .from("team_memberships")
      .select("user_id")
      .eq("team_id", teamId)
      .eq("user_id", existingProfile.id)
      .maybeSingle()

    if (existingMember) {
      return {
        ok: false,
        message: "This person is already a member of this team.",
      }
    }
  }

  // Existing pending invite for (team, email)? The unique partial index also
  // enforces this, but checking first lets us return a clear message without
  // surfacing the raw constraint violation.
  const { data: existingPending } = await supabase
    .from("invitations")
    .select("id")
    .eq("team_id", teamId)
    .eq("email", cleanEmail)
    .eq("status", "pending")
    .maybeSingle()

  if (existingPending) {
    return {
      ok: false,
      message: "This person already has a pending invite to this team.",
    }
  }

  const { data: requester } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle()

  const { data: invite, error } = await supabase
    .from("invitations")
    .insert({
      team_id: teamId,
      email: cleanEmail,
      role: cleanRole,
      invited_by: user.id,
    })
    .select("id, token, email, role")
    .maybeSingle()

  if (error) {
    const isDuplicate = error.code === "23505"
    if (isDuplicate) {
      return {
        ok: false,
        message: "This person already has a pending invite to this team.",
      }
    }
    return { ok: false, message: error.message }
  }

  if (invite) {
    const acceptUrl = `${getSiteOrigin()}/invite/${invite.token}`
    after(async () => {
      await sendInvitationEmail({
        to: invite.email,
        inviterName: requester?.full_name?.trim() || (user.email ?? "Someone"),
        teamName: team.name,
        role: invite.role as "admin" | "member",
        acceptUrl,
      })
    })
  }

  revalidatePath("/app/team")
  return { ok: true }
}

export async function revokeInvitation(
  invitationId: string,
): Promise<TeamActionResult> {
  if (!isUuid(invitationId)) {
    return { ok: false, message: "Invalid invitation." }
  }

  const { supabase, user } = await getCurrentUserOrRedirect()

  const { data: invite } = await supabase
    .from("invitations")
    .select("id, team_id")
    .eq("id", invitationId)
    .maybeSingle()

  if (!invite) {
    return { ok: false, message: "Invitation not found." }
  }

  const myRole = await getMyRole(supabase, invite.team_id, user.id)
  if (myRole === null || myRole === "member") {
    return {
      ok: false,
      message: "You need admin access to manage invitations.",
    }
  }

  const { error } = await supabase
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("status", "pending")

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/app/team")
  return { ok: true }
}

export async function acceptInvitation(
  token: string,
): Promise<TeamActionResult> {
  const cleanToken = String(token ?? "").trim()
  if (!cleanToken) {
    return { ok: false, message: "Missing invitation token." }
  }

  const { supabase } = await getCurrentUserOrRedirect()

  const { data: teamId, error } = await supabase.rpc("accept_invitation", {
    p_token: cleanToken,
  })

  if (error) {
    return { ok: false, message: mapAcceptError(error.message) }
  }

  // A NULL result means the invitation expired: the RPC committed the status
  // flip to 'expired' but did not join a team.
  if (!teamId) {
    return {
      ok: false,
      message: "This invitation has expired. Ask your admin to send a new one.",
    }
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_TEAM_COOKIE, teamId, {
    path: "/",
    sameSite: "lax",
  })

  revalidatePath("/", "layout")
  revalidatePath("/app", "layout")

  return { ok: true, teamId }
}

export async function changeMemberRole(
  teamId: string,
  userId: string,
  newRole: string,
): Promise<TeamActionResult> {
  const cleanRole = String(newRole ?? "").trim()

  if (!isUuid(teamId)) {
    return { ok: false, message: "Invalid team." }
  }
  if (!isUuid(userId)) {
    return { ok: false, message: "Invalid member." }
  }
  if (cleanRole !== "owner" && cleanRole !== "admin" && cleanRole !== "member") {
    return { ok: false, message: "Invalid role." }
  }

  const { supabase, user } = await getCurrentUserOrRedirect()
  if (userId === user.id) {
    return { ok: false, message: "You can't change your own role." }
  }

  const myRole = await getMyRole(supabase, teamId, user.id)
  if (myRole === null || myRole === "member") {
    return { ok: false, message: "You need admin access to change roles." }
  }

  // You can't promote anyone to (or above) your own rank.
  if (ROLE_RANK[myRole] <= ROLE_RANK[cleanRole as TeamRole]) {
    return { ok: false, message: "You can only assign roles below your own." }
  }

  const { data: target } = await supabase
    .from("team_memberships")
    .select("user_id, role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle()

  if (!target) {
    return { ok: false, message: "Member not found in this team." }
  }

  // Admins may only manage ordinary members; owners handle admins. Nobody can
  // change another owner's role at all.
  if (myRole === "admin" && target.role !== "member") {
    return { ok: false, message: "Only owners can change the role of admins." }
  }
  if (target.role === "owner") {
    return { ok: false, message: "You can't change another owner's role." }
  }

  const { error } = await supabase
    .from("team_memberships")
    .update({ role: cleanRole })
    .eq("team_id", teamId)
    .eq("user_id", userId)

  if (error) {
    if (error.message.includes("cannot_demote_last_owner")) {
      return { ok: false, message: "A team must keep at least one owner." }
    }
    return { ok: false, message: error.message }
  }

  revalidatePath("/app/team")
  return { ok: true }
}

export async function removeMember(
  teamId: string,
  userId: string,
): Promise<TeamActionResult> {
  if (!isUuid(teamId)) {
    return { ok: false, message: "Invalid team." }
  }
  if (!isUuid(userId)) {
    return { ok: false, message: "Invalid member." }
  }

  const { supabase, user } = await getCurrentUserOrRedirect()
  if (userId === user.id) {
    return { ok: false, message: "You can't remove yourself." }
  }

  const myRole = await getMyRole(supabase, teamId, user.id)
  if (myRole === null || myRole === "member") {
    return { ok: false, message: "You need admin access to remove members." }
  }

  const { data: target } = await supabase
    .from("team_memberships")
    .select("user_id, role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle()

  if (!target) {
    return { ok: false, message: "Member not found in this team." }
  }

  // Only owners can remove owners or admins; admins can remove members only.
  if (myRole === "admin" && target.role !== "member") {
    return { ok: false, message: "Only owners can remove admins." }
  }
  if (target.role === "owner") {
    return { ok: false, message: "You can't remove a team owner." }
  }

  const { error } = await supabase
    .from("team_memberships")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId)

  if (error) {
    if (error.message.includes("cannot_remove_last_owner")) {
      return { ok: false, message: "A team must keep at least one owner." }
    }
    return { ok: false, message: error.message }
  }

  revalidatePath("/app/team")
  revalidatePath("/", "layout")
  return { ok: true }
}

function mapAcceptError(message: string): string {
  if (message.includes("invitation_expired")) {
    return "This invitation has expired. Ask an admin to invite you again."
  }
  if (message.includes("email_mismatch")) {
    return (
      "This invitation was sent to a different email address. " +
      "Sign in with the account it was sent to."
    )
  }
  if (message.includes("invalid_or_used_invitation")) {
    return "This invitation is invalid or has already been used."
  }
  return message
}