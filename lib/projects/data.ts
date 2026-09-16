import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"]
export type ProjectStatus = Database["public"]["Enums"]["project_status"]
export type ProjectHealth = Database["public"]["Enums"]["project_health"]

export type ProjectSummary = ProjectRow & {
  lead: { id: string; full_name: string | null; email: string | null; avatar_url: string | null } | null
  total: number
  completed: number
  started: number
  overdue: number
  progress: number
}

export { PROJECT_STATUS_META, PROJECT_HEALTH_META } from "@/lib/projects/meta"

export const getProjects = cache(async (workspaceId: string, includeArchived = false): Promise<ProjectSummary[]> => {
  const supabase = await createClient()
  let query = supabase
    .from("projects")
    .select("*, lead:profiles!projects_lead_id_fkey ( id, full_name, email, avatar_url )")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
  if (!includeArchived) query = query.is("archived_at", null)
  const { data: projects } = await query

  const { data: items } = await supabase
    .from("work_items")
    .select("project_id, due_date, completed_at, statuses ( category )")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)

  const today = new Date().toISOString().slice(0, 10)
  const counts = new Map<string, { total: number; completed: number; started: number; overdue: number }>()
  for (const item of items ?? []) {
    const c = counts.get(item.project_id) ?? { total: 0, completed: 0, started: 0, overdue: 0 }
    const category = item.statuses?.category
    if (category !== "canceled") c.total += 1
    if (category === "completed") c.completed += 1
    if (category === "started") c.started += 1
    if (item.due_date && item.due_date < today && category !== "completed" && category !== "canceled") c.overdue += 1
    counts.set(item.project_id, c)
  }

  return (projects ?? []).map((project) => {
    const c = counts.get(project.id) ?? { total: 0, completed: 0, started: 0, overdue: 0 }
    return {
      ...project,
      lead: project.lead ?? null,
      ...c,
      progress: c.total === 0 ? 0 : Math.round((c.completed / c.total) * 100),
    }
  })
})

export const getProjectBySlug = cache(async (workspaceId: string, slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("projects")
    .select("*, lead:profiles!projects_lead_id_fkey ( id, full_name, email, avatar_url )")
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .maybeSingle()
  return data
})

export const getProjectUpdates = cache(async (projectId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("project_updates")
    .select("id, health, body, created_at, author:profiles!project_updates_author_id_fkey ( id, full_name, email, avatar_url )")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20)
  return data ?? []
})

export const getProjectMembers = cache(async (projectId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("project_memberships")
    .select("user_id, profiles ( id, full_name, email, avatar_url )")
    .eq("project_id", projectId)
  return (data ?? []).map((row) => row.profiles).filter((p): p is NonNullable<typeof p> => Boolean(p))
})
