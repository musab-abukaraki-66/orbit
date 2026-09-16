"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function markNotificationRead(id: string, slug: string, read = true) {
  if (!UUID.test(id)) return { ok: false }
  const supabase = await createClient()
  await supabase.from("notifications").update({ read_at: read ? new Date().toISOString() : null }).eq("id", id)
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}

export async function markAllNotificationsRead(workspaceId: string, slug: string) {
  const supabase = await createClient()
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("workspace_id", workspaceId).is("read_at", null)
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}
