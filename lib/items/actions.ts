"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import type { ItemPayload, Priority } from "@/lib/items/types"

export type ItemActionResult = { ok: true; item: ItemPayload } | { ok: false; message: string }
export type ActionResult = { ok: boolean; message?: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PRIORITIES: Priority[] = ["none", "low", "medium", "high", "urgent"]

export type ItemInput = {
  title?: string
  description?: string | null
  status_id?: string
  priority?: Priority
  assignee_id?: string | null
  due_date?: string | null
  label_ids?: string[]
  project_id?: string
}

function friendly(message: string) {
  if (message.includes("assignee_not_member")) return "The assignee must be a member of this workspace."
  if (message.includes("row-level security")) return "You don't have permission to do that."
  return message
}

function sanitize(input: ItemInput) {
  const out: ItemInput = {}
  if (input.title !== undefined) out.title = input.title.trim().slice(0, 300)
  if (input.description !== undefined) out.description = input.description?.trim() ? input.description.trim() : null
  if (input.status_id !== undefined && UUID.test(input.status_id)) out.status_id = input.status_id
  if (input.priority !== undefined && PRIORITIES.includes(input.priority)) out.priority = input.priority
  if (input.assignee_id !== undefined) out.assignee_id = input.assignee_id && UUID.test(input.assignee_id) ? input.assignee_id : null
  if (input.due_date !== undefined) out.due_date = input.due_date && /^\d{4}-\d{2}-\d{2}$/.test(input.due_date) ? input.due_date : null
  if (input.label_ids !== undefined) out.label_ids = input.label_ids.filter((id) => UUID.test(id))
  if (input.project_id !== undefined && UUID.test(input.project_id)) out.project_id = input.project_id
  return out
}

async function syncLabels(supabase: Awaited<ReturnType<typeof createClient>>, itemId: string, labelIds: string[]) {
  const { data: existing } = await supabase.from("work_item_labels").select("label_id").eq("work_item_id", itemId)
  const current = new Set((existing ?? []).map((row) => row.label_id))
  const wanted = new Set(labelIds)
  const toAdd = [...wanted].filter((id) => !current.has(id))
  const toRemove = [...current].filter((id) => !wanted.has(id))
  if (toAdd.length) {
    const { error } = await supabase.from("work_item_labels").insert(toAdd.map((label_id) => ({ work_item_id: itemId, label_id })))
    if (error) return error.message
  }
  if (toRemove.length) {
    const { error } = await supabase.from("work_item_labels").delete().eq("work_item_id", itemId).in("label_id", toRemove)
    if (error) return error.message
  }
  return null
}

async function loadItem(supabase: Awaited<ReturnType<typeof createClient>>, itemId: string): Promise<ItemPayload | null> {
  const { data } = await supabase.from("work_items").select("*").eq("id", itemId).maybeSingle()
  if (!data) return null
  const { data: labels } = await supabase.from("work_item_labels").select("label_id").eq("work_item_id", itemId)
  return { ...data, label_ids: (labels ?? []).map((row) => row.label_id) }
}

export async function createItem(projectId: string, slug: string, input: ItemInput): Promise<ItemActionResult> {
  if (!UUID.test(projectId)) return { ok: false, message: "Invalid project." }
  const fields = sanitize(input)
  if (!fields.title) return { ok: false, message: "Give the task a title." }
  const supabase = await createClient()
  const { label_ids, project_id, ...rest } = fields
  void project_id
  const { data, error } = await supabase
    .from("work_items")
    .insert({ project_id: projectId, ...rest, title: fields.title })
    .select("id")
    .single()
  if (error || !data) return { ok: false, message: friendly(error?.message ?? "Could not create the task.") }
  if (label_ids?.length) {
    const labelError = await syncLabels(supabase, data.id, label_ids)
    if (labelError) return { ok: false, message: labelError }
  }
  const item = await loadItem(supabase, data.id)
  if (!item) return { ok: false, message: "Task created but could not be loaded." }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true, item }
}

export async function updateItem(itemId: string, slug: string, input: ItemInput): Promise<ItemActionResult> {
  if (!UUID.test(itemId)) return { ok: false, message: "Invalid task." }
  const fields = sanitize(input)
  if (fields.title !== undefined && !fields.title) return { ok: false, message: "A task needs a title." }
  const supabase = await createClient()
  const { label_ids, ...rest } = fields
  if (Object.keys(rest).length) {
    const { data, error } = await supabase.from("work_items").update(rest).eq("id", itemId).select("id").maybeSingle()
    if (error) return { ok: false, message: friendly(error.message) }
    if (!data) return { ok: false, message: "Task not found or you can't edit it." }
  }
  if (label_ids !== undefined) {
    const labelError = await syncLabels(supabase, itemId, label_ids)
    if (labelError) return { ok: false, message: labelError }
  }
  const item = await loadItem(supabase, itemId)
  if (!item) return { ok: false, message: "Task not found." }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true, item }
}

export async function moveItem(itemId: string, slug: string, statusId: string, targetIndex: number): Promise<ItemActionResult> {
  if (!UUID.test(itemId) || !UUID.test(statusId)) return { ok: false, message: "Invalid task or status." }
  if (!Number.isInteger(targetIndex) || targetIndex < 0) return { ok: false, message: "Invalid position." }
  const supabase = await createClient()

  const { data: item } = await supabase.from("work_items").select("id, project_id, status_id, team_id").eq("id", itemId).maybeSingle()
  if (!item) return { ok: false, message: "Task not found." }
  const { data: status } = await supabase.from("statuses").select("id, team_id").eq("id", statusId).maybeSingle()
  if (!status || status.team_id !== item.team_id) return { ok: false, message: "That status belongs to a different team." }

  const { data: siblings } = await supabase
    .from("work_items")
    .select("id, position")
    .eq("project_id", item.project_id)
    .eq("status_id", statusId)
    .is("archived_at", null)
    .neq("id", itemId)
    .order("position", { ascending: true })

  const list = siblings ?? []
  const index = Math.min(targetIndex, list.length)
  const before = index > 0 ? list[index - 1].position : null
  const after = index < list.length ? list[index].position : null
  let position: number
  if (before === null && after === null) position = 1024
  else if (before === null) position = after! - 1024
  else if (after === null) position = before + 1024
  else position = (before + after) / 2

  if (before !== null && after !== null && (position <= before || position >= after)) {
    // Precision collapsed: renumber this lane, then place at the requested slot.
    const renumbered = list.map((row, i) => ({ id: row.id, position: (i + (i >= index ? 2 : 1)) * 1024 }))
    for (const row of renumbered) {
      await supabase.from("work_items").update({ position: row.position }).eq("id", row.id)
    }
    position = (index + 1) * 1024
  }

  const { data, error } = await supabase
    .from("work_items")
    .update({ status_id: statusId, position })
    .eq("id", itemId)
    .select("id")
    .maybeSingle()
  if (error) return { ok: false, message: friendly(error.message) }
  if (!data) return { ok: false, message: "You can't move this task." }
  const updated = await loadItem(supabase, itemId)
  if (!updated) return { ok: false, message: "Task not found." }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true, item: updated }
}

export async function deleteItem(itemId: string, slug: string): Promise<ActionResult> {
  if (!UUID.test(itemId)) return { ok: false, message: "Invalid task." }
  const supabase = await createClient()
  const { data, error } = await supabase.from("work_items").delete().eq("id", itemId).select("id").maybeSingle()
  if (error) return { ok: false, message: friendly(error.message) }
  if (!data) {
    // Members who did not create the task can archive it instead.
    const { data: archived, error: archiveError } = await supabase
      .from("work_items")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", itemId)
      .select("id")
      .maybeSingle()
    if (archiveError) return { ok: false, message: friendly(archiveError.message) }
    if (!archived) return { ok: false, message: "Task not found or you can't remove it." }
  }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}

export async function createLabel(workspaceId: string, slug: string, name: string, color: string): Promise<{ ok: true; label: { id: string; name: string; color: string } } | { ok: false; message: string }> {
  const clean = name.trim().slice(0, 40)
  if (!clean) return { ok: false, message: "Label needs a name." }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("labels")
    .insert({ workspace_id: workspaceId, name: clean, color: color || "slate" })
    .select("id, name, color")
    .single()
  if (error) return { ok: false, message: error.code === "23505" ? "A label with that name already exists." : friendly(error.message) }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true, label: data }
}

export async function updateLabel(labelId: string, slug: string, name: string, color: string): Promise<ActionResult> {
  if (!UUID.test(labelId)) return { ok: false, message: "Invalid label." }
  const supabase = await createClient()
  const { data, error } = await supabase.from("labels").update({ name: name.trim().slice(0, 40), color }).eq("id", labelId).select("id").maybeSingle()
  if (error) return { ok: false, message: friendly(error.message) }
  if (!data) return { ok: false, message: "Only admins can edit labels." }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}

export async function deleteLabel(labelId: string, slug: string): Promise<ActionResult> {
  if (!UUID.test(labelId)) return { ok: false, message: "Invalid label." }
  const supabase = await createClient()
  const { data, error } = await supabase.from("labels").delete().eq("id", labelId).select("id").maybeSingle()
  if (error) return { ok: false, message: friendly(error.message) }
  if (!data) return { ok: false, message: "Only admins can delete labels." }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}

export async function addComment(itemId: string, slug: string, body: string, mentions: string[]): Promise<ActionResult & { id?: string }> {
  if (!UUID.test(itemId)) return { ok: false, message: "Invalid task." }
  const text = body.trim()
  if (!text) return { ok: false, message: "Write something first." }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("comments")
    .insert({ work_item_id: itemId, body: text.slice(0, 8000), mentions: mentions.filter((id) => UUID.test(id)) })
    .select("id")
    .single()
  if (error) return { ok: false, message: friendly(error.message) }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true, id: data.id }
}

export async function editComment(commentId: string, slug: string, body: string): Promise<ActionResult> {
  if (!UUID.test(commentId)) return { ok: false, message: "Invalid comment." }
  const text = body.trim()
  if (!text) return { ok: false, message: "A comment can't be empty." }
  const supabase = await createClient()
  const { data, error } = await supabase.from("comments").update({ body: text.slice(0, 8000) }).eq("id", commentId).select("id").maybeSingle()
  if (error) return { ok: false, message: friendly(error.message) }
  if (!data) return { ok: false, message: "You can only edit your own comments." }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}

export async function deleteComment(commentId: string, slug: string): Promise<ActionResult> {
  if (!UUID.test(commentId)) return { ok: false, message: "Invalid comment." }
  const supabase = await createClient()
  const { data, error } = await supabase.from("comments").delete().eq("id", commentId).select("id").maybeSingle()
  if (error) return { ok: false, message: friendly(error.message) }
  if (!data) return { ok: false, message: "You can only delete your own comments." }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}
