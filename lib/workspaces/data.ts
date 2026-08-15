import { cache } from "react"
import { cookies } from "next/headers"

import { createClient } from "@/lib/supabase/server"
import { getActiveTeam } from "@/lib/auth/session"
import { getBoardsForWorkspace } from "@/lib/boards/data"

export const ACTIVE_WORKSPACE_COOKIE = "orbit_active_workspace"

export type WorkspaceContext = {
  team: NonNullable<Awaited<ReturnType<typeof getActiveTeam>>>
  workspaces: Awaited<ReturnType<typeof getWorkspacesForTeam>>
  activeWorkspace: Awaited<ReturnType<typeof getWorkspacesForTeam>>[number] | null
  boards: Awaited<ReturnType<typeof getBoardsForWorkspace>>
}

export const getWorkspacesForTeam = cache(async (teamId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("workspaces")
    .select("id, name, slug, created_at, updated_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true })

  return data ?? []
})

export async function getWorkspaceById(workspaceId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("workspaces")
    .select("id, name, slug, created_at, updated_at")
    .eq("id", workspaceId)
    .maybeSingle()

  return data
}

export async function getTeamMemberCount(teamId: string) {
  const supabase = await createClient()
  const { count } = await supabase
    .from("team_memberships")
    .select("user_id", { count: "exact", head: true })
    .eq("team_id", teamId)

  return count ?? 0
}

export async function getBoardCountsByWorkspace(_teamId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("boards")
    .select("id, workspace_id")

  const counts = new Map<string, number>()
  for (const board of data ?? []) {
    counts.set(board.workspace_id, (counts.get(board.workspace_id) ?? 0) + 1)
  }

  return counts
}

export async function getWorkspaceContext(
  userId: string,
): Promise<WorkspaceContext | null> {
  const team = await getActiveTeam(userId)
  if (!team) return null

  const workspaces = await getWorkspacesForTeam(team.id)
  const cookieStore = await cookies()
  const cookieId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === cookieId) ?? workspaces[0]

  const boards = activeWorkspace
    ? await getBoardsForWorkspace(activeWorkspace.id)
    : []

  return { team, workspaces, activeWorkspace: activeWorkspace ?? null, boards }
}
