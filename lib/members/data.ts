import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"

export type MemberRow = {
  user_id: string
  role: Database["public"]["Enums"]["ws_role"]
  created_at: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

export const getWorkspaceMembers = cache(async (workspaceId: string): Promise<MemberRow[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("workspace_memberships")
    .select("user_id, role, created_at, profiles ( full_name, email, avatar_url )")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })

  return (data ?? []).map((row) => ({
    user_id: row.user_id,
    role: row.role,
    created_at: row.created_at,
    full_name: row.profiles?.full_name ?? null,
    email: row.profiles?.email ?? null,
    avatar_url: row.profiles?.avatar_url ?? null,
  }))
})

export const getPendingInvitations = cache(async (workspaceId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("invitations")
    .select("id, email, role, status, expires_at, created_at, invited_by")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
  return data ?? []
})

export { memberLabel, initialsOf } from "@/lib/members/format"
