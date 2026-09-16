"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireUser } from "@/lib/auth/session"
import { sendInvitationEmail } from "@/lib/resend/invitation"
import { getSiteOrigin } from "@/lib/site-url"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"

type Role = Database["public"]["Enums"]["ws_role"]

export type InviteState =
  | { ok: true; link: string; email: string; emailed: boolean }
  | { ok: false; message: string }
  | undefined

export type ActionResult = { ok: boolean; message?: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function mapInviteError(message: string) {
  if (message.includes("already_member")) return "That person is already a member of this workspace."
  if (message.includes("role_too_high")) return "You can't invite someone with a higher role than your own."
  if (message.includes("forbidden")) return "Only owners and admins can invite people."
  if (/email/i.test(message) && /check/i.test(message)) return "That doesn't look like a valid email address."
  return message
}

export async function inviteMember(workspaceId: string, slug: string, _prev: InviteState, formData: FormData): Promise<InviteState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const role: "admin" | "member" = String(formData.get("role") ?? "member") === "admin" ? "admin" : "member"
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Enter a valid email address." }

  const user = await requireUser()
  const supabase = await createClient()
  const { data: token, error } = await supabase.rpc("create_invitation", {
    p_workspace: workspaceId,
    p_email: email,
    p_role: role,
  })
  if (error || !token) return { ok: false, message: mapInviteError(error?.message ?? "Could not create the invitation.") }

  const link = `${getSiteOrigin()}/invite/${token}`
  const { data: ws } = await supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle()
  const inviterName = String(user.user_metadata?.full_name ?? user.email ?? "A teammate")

  let emailed = false
  try {
    emailed = await sendInvitationEmail({
      to: email,
      inviterName,
      teamName: ws?.name ?? "Orbit",
      role,
      acceptUrl: link,
    })
  } catch {
    emailed = false
  }

  revalidatePath(`/w/${slug}/settings/members`)
  return { ok: true, link, email, emailed }
}

export async function revokeInvitation(invitationId: string, slug: string): Promise<ActionResult> {
  if (!UUID.test(invitationId)) return { ok: false, message: "Invalid invitation." }
  const supabase = await createClient()
  const { error } = await supabase.from("invitations").update({ status: "revoked" }).eq("id", invitationId).eq("status", "pending")
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/w/${slug}/settings/members`)
  return { ok: true }
}

export async function changeMemberRole(workspaceId: string, slug: string, userId: string, role: Role): Promise<ActionResult> {
  if (!UUID.test(userId)) return { ok: false, message: "Invalid member." }
  if (role === "owner") return { ok: false, message: "Use “Transfer ownership” to make someone the owner." }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workspace_memberships")
    .update({ role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle()
  if (error) return { ok: false, message: error.message.includes("last_owner") ? "A workspace needs at least one owner." : error.message }
  if (!data) return { ok: false, message: "You can't change this member's role." }
  revalidatePath(`/w/${slug}/settings/members`)
  return { ok: true }
}

export async function removeMember(workspaceId: string, slug: string, userId: string): Promise<ActionResult> {
  if (!UUID.test(userId)) return { ok: false, message: "Invalid member." }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workspace_memberships")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle()
  if (error) return { ok: false, message: error.message.includes("last_owner") ? "A workspace needs at least one owner." : error.message }
  if (!data) return { ok: false, message: "You can't remove this member." }
  revalidatePath(`/w/${slug}/settings/members`)
  return { ok: true }
}

export async function leaveWorkspace(workspaceId: string): Promise<ActionResult> {
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.from("workspace_memberships").delete().eq("workspace_id", workspaceId).eq("user_id", user.id)
  if (error) return { ok: false, message: error.message.includes("last_owner") ? "Transfer ownership before leaving — you're the only owner." : error.message }
  revalidatePath("/", "layout")
  redirect("/app")
}

export async function transferOwnership(workspaceId: string, slug: string, userId: string): Promise<ActionResult> {
  if (!UUID.test(userId)) return { ok: false, message: "Invalid member." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("transfer_ownership", { p_workspace: workspaceId, p_user: userId })
  if (error) return { ok: false, message: error.message.includes("forbidden") ? "Only the owner can transfer ownership." : error.message }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}

export async function acceptInvitation(token: string): Promise<ActionResult & { slug?: string }> {
  await requireUser()
  const supabase = await createClient()
  const { data: workspaceId, error } = await supabase.rpc("accept_invitation", { p_token: token })
  if (error || !workspaceId) {
    const m = error?.message ?? ""
    if (m.includes("email_mismatch")) return { ok: false, message: "This invitation was sent to a different email address. Sign in with that account to accept it." }
    if (m.includes("invitation_expired")) return { ok: false, message: "This invitation has expired. Ask for a new one." }
    if (m.includes("invalid_or_used")) return { ok: false, message: "This invitation is no longer valid." }
    return { ok: false, message: m || "Could not accept the invitation." }
  }
  const { data: ws } = await supabase.from("workspaces").select("slug").eq("id", workspaceId).maybeSingle()
  revalidatePath("/", "layout")
  return { ok: true, slug: ws?.slug }
}
