import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import type { ActivityRow, CommentRow, ItemPayload, LabelRow, ProfileLite, StatusRow } from "@/lib/items/types"

export const getStatusesForWorkspace = cache(async (workspaceId: string): Promise<StatusRow[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("statuses")
    .select("*, teams!inner ( workspace_id )")
    .eq("teams.workspace_id", workspaceId)
    .order("position", { ascending: true })
  return (data ?? []).map(({ teams: _teams, ...status }) => status)
})

export const getLabelsForWorkspace = cache(async (workspaceId: string): Promise<LabelRow[]> => {
  const supabase = await createClient()
  const { data } = await supabase.from("labels").select("*").eq("workspace_id", workspaceId).order("name")
  return data ?? []
})

export const getProfilesForWorkspace = cache(async (workspaceId: string): Promise<ProfileLite[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("workspace_memberships")
    .select("profiles ( id, full_name, email, avatar_url )")
    .eq("workspace_id", workspaceId)
  return (data ?? []).map((row) => row.profiles).filter((p): p is ProfileLite => Boolean(p))
})

async function attachLabels(supabase: Awaited<ReturnType<typeof createClient>>, items: Omit<ItemPayload, "label_ids">[]): Promise<ItemPayload[]> {
  if (items.length === 0) return []
  const { data } = await supabase
    .from("work_item_labels")
    .select("work_item_id, label_id")
    .in("work_item_id", items.map((item) => item.id))
  const map = new Map<string, string[]>()
  for (const row of data ?? []) {
    map.set(row.work_item_id, [...(map.get(row.work_item_id) ?? []), row.label_id])
  }
  return items.map((item) => ({ ...item, label_ids: map.get(item.id) ?? [] }))
}

export const getItemsForProject = cache(async (projectId: string): Promise<ItemPayload[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("work_items")
    .select("*")
    .eq("project_id", projectId)
    .is("archived_at", null)
    .order("position", { ascending: true })
  return attachLabels(supabase, data ?? [])
})

export const getItemsForWorkspace = cache(async (workspaceId: string): Promise<ItemPayload[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("work_items")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(500)
  return attachLabels(supabase, data ?? [])
})

export const getItemByKey = cache(async (workspaceId: string, key: string): Promise<ItemPayload | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("work_items")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("key", key.toUpperCase())
    .maybeSingle()
  if (!data) return null
  const [item] = await attachLabels(supabase, [data])
  return item
})

export const getCommentsForItem = cache(async (itemId: string): Promise<CommentRow[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("comments")
    .select("id, work_item_id, author_id, body, mentions, edited_at, created_at")
    .eq("work_item_id", itemId)
    .order("created_at", { ascending: true })
  return data ?? []
})

export const getActivityForItem = cache(async (itemId: string): Promise<ActivityRow[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("activity_log")
    .select("id, actor_id, project_id, work_item_id, comment_id, action, data, created_at")
    .eq("work_item_id", itemId)
    .order("created_at", { ascending: true })
    .limit(200)
  return (data ?? []) as ActivityRow[]
})

export const getRecentActivity = cache(async (workspaceId: string, limit = 30): Promise<ActivityRow[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("activity_log")
    .select("id, actor_id, project_id, work_item_id, comment_id, action, data, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as ActivityRow[]
})
