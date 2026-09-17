import { cache } from "react"
import { notFound, redirect } from "next/navigation"

import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"

export type WorkspaceRole = Database["public"]["Enums"]["ws_role"]

export type WorkspaceContext = {
  id: string
  name: string
  slug: string
  key: string
  role: WorkspaceRole
  userId: string
  isAdmin: boolean
  isOwner: boolean
}

export const getUserWorkspaces = cache(async () => {
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase
    .from("workspace_memberships")
    .select("role, created_at, workspaces ( id, name, slug, key )")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  return (data ?? [])
    .filter((row) => row.workspaces)
    .map((row) => ({ ...row.workspaces!, role: row.role }))
})

export const getWorkspaceContext = cache(async (slug: string): Promise<WorkspaceContext | null> => {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, key, workspace_memberships!inner ( role, user_id )")
    .eq("slug", slug)
    .eq("workspace_memberships.user_id", user.id)
    .maybeSingle()

  // A transport or auth failure must surface as an error (retryable), never
  // as a 404 for a workspace the user can actually access.
  if (error) throw new Error(`Could not load the workspace: ${error.message}`)
  if (!data) return null
  const role = data.workspace_memberships[0]?.role ?? "member"
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    key: data.key,
    role,
    userId: user.id,
    isAdmin: role === "owner" || role === "admin",
    isOwner: role === "owner",
  }
})

export const requireWorkspace = cache(async (slug: string) => {
  const context = await getWorkspaceContext(slug)
  if (!context) notFound()
  return context
})

export async function redirectToDefaultWorkspace(): Promise<never> {
  const workspaces = await getUserWorkspaces()
  if (workspaces.length === 0) redirect("/onboarding")
  redirect(`/w/${workspaces[0].slug}`)
}
