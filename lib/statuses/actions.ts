"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"

type Category = Database["public"]["Enums"]["status_category"]
const CATEGORIES: Category[] = ["backlog", "unstarted", "started", "completed", "canceled"]
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ActionResult = { ok: boolean; message?: string }

function friendly(message: string) {
  if (message.includes("row-level security")) return "Only owners and admins can manage statuses."
  if (message.includes("statuses_team_name_key")) return "A status with that name already exists."
  if (message.includes("work_items_status_id_team_id_fkey")) return "Move the tasks in this status somewhere else first."
  return message
}

export async function createStatus(teamId: string, slug: string, name: string, category: Category, color: string): Promise<ActionResult> {
  if (!UUID.test(teamId) || !CATEGORIES.includes(category)) return { ok: false, message: "Invalid request." }
  const clean = name.trim().slice(0, 40)
  if (!clean) return { ok: false, message: "Give the status a name." }
  const supabase = await createClient()
  const { data: last } = await supabase.from("statuses").select("position").eq("team_id", teamId).order("position", { ascending: false }).limit(1).maybeSingle()
  const { error } = await supabase.from("statuses").insert({ team_id: teamId, name: clean, category, color: color || "slate", position: (last?.position ?? 0) + 1 })
  if (error) return { ok: false, message: friendly(error.message) }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}

export async function updateStatus(statusId: string, slug: string, patch: { name?: string; color?: string; category?: Category; position?: number; is_default?: boolean }): Promise<ActionResult> {
  if (!UUID.test(statusId)) return { ok: false, message: "Invalid status." }
  const supabase = await createClient()
  const fields: typeof patch = {}
  if (patch.name !== undefined) fields.name = patch.name.trim().slice(0, 40)
  if (patch.color !== undefined) fields.color = patch.color
  if (patch.category !== undefined && CATEGORIES.includes(patch.category)) fields.category = patch.category
  if (patch.position !== undefined && Number.isFinite(patch.position)) fields.position = patch.position
  if (patch.is_default) {
    const { data: row } = await supabase.from("statuses").select("team_id").eq("id", statusId).maybeSingle()
    if (row) await supabase.from("statuses").update({ is_default: false }).eq("team_id", row.team_id).eq("is_default", true)
    fields.is_default = true
  }
  const { data, error } = await supabase.from("statuses").update(fields).eq("id", statusId).select("id").maybeSingle()
  if (error) return { ok: false, message: friendly(error.message) }
  if (!data) return { ok: false, message: "Only owners and admins can manage statuses." }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}

export async function deleteStatus(statusId: string, slug: string): Promise<ActionResult> {
  if (!UUID.test(statusId)) return { ok: false, message: "Invalid status." }
  const supabase = await createClient()
  const { count } = await supabase.from("work_items").select("id", { count: "exact", head: true }).eq("status_id", statusId)
  if (count && count > 0) return { ok: false, message: `${count} task${count === 1 ? " is" : "s are"} in this status. Move them first.` }
  const { data, error } = await supabase.from("statuses").delete().eq("id", statusId).select("id").maybeSingle()
  if (error) return { ok: false, message: friendly(error.message) }
  if (!data) return { ok: false, message: "Only owners and admins can manage statuses." }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}
