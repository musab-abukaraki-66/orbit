import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"] & {
  item: { key: string; title: string; project: { slug: string } | null } | null
}

export const getNotifications = cache(async (workspaceId: string, limit = 50): Promise<NotificationRow[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("notifications")
    .select("*, item:work_items ( key, title, project:projects ( slug ) )")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as NotificationRow[]
})

export const getUnreadCount = cache(async (workspaceId: string): Promise<number> => {
  const supabase = await createClient()
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .is("read_at", null)
  return count ?? 0
})
