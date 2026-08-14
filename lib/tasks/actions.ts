"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import type { LabelPayload, TaskPayload } from "@/lib/tasks/types"

export type TaskFormState =
  | {
      ok: boolean
      message?: string
      task?: TaskPayload
      label_ids?: string[]
    }
  | undefined

export type TaskActionResult = {
  ok: boolean
  message?: string
  task?: TaskPayload
}

export type LabelActionResult = {
  ok: boolean
  message?: string
  labels?: LabelPayload[]
  label?: LabelPayload
}

const PRIORITIES = ["low", "medium", "high", "urgent"]
const TITLE_MAX = 200
const DESCRIPTION_MAX = 10_000
const LABEL_NAME_MAX = 40
const LABEL_COLORS = ["slate", "rose", "amber", "emerald", "sky", "violet", "indigo", "teal"]
const DUE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const TASK_COLUMNS =
  "id, column_id, title, description, priority, status, position, assignee_id, due_date, created_by, created_at, updated_at"

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
}

async function getCurrentUserOrRedirect() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return { supabase, user }
}

// Resolve the parent team of a board through board -> workspace. Returns null
// when the board is unreachable (which also means the caller has no access).
async function resolveBoardTeam(
  supabase: Awaited<ReturnType<typeof createClient>>,
  boardId: string,
): Promise<string | null> {
  const { data: board } = await supabase
    .from("boards")
    .select("workspace_id")
    .eq("id", boardId)
    .maybeSingle()
  if (!board) return null

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("team_id")
    .eq("id", board.workspace_id)
    .maybeSingle()
  return workspace?.team_id ?? null
}

function parseTaskInput(formData: FormData): {
  title: string
  description: string | null
  priority: string
  assignee_id: string | null
  due_date: string | null
  label_ids: string[]
  error?: string
} {
  const empty = (error: string) => ({
    title: "",
    description: null,
    priority: "",
    assignee_id: null,
    due_date: null,
    label_ids: [] as string[],
    error,
  })

  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim() || null
  const priority = String(formData.get("priority") ?? "medium")
  const assigneeRaw = String(formData.get("assignee_id") ?? "").trim()
  const dueDateRaw = String(formData.get("due_date") ?? "").trim()
  const labelsRaw = String(formData.get("labels") ?? "").trim()

  if (!title) return empty("Please give your task a title.")
  if (title.length > TITLE_MAX)
    return empty(`Task titles are limited to ${TITLE_MAX} characters.`)
  if (description && description.length > DESCRIPTION_MAX)
    return empty("Task descriptions are too long.")
  if (!PRIORITIES.includes(priority)) return empty("Invalid priority.")

  let due_date: string | null = null
  if (dueDateRaw) {
    if (!DUE_DATE_RE.test(dueDateRaw) || Number.isNaN(Date.parse(dueDateRaw)))
      return empty("Invalid due date.")
    due_date = dueDateRaw
  }

  const label_ids: string[] = []
  if (labelsRaw) {
    for (const part of labelsRaw.split(",")) {
      const id = part.trim()
      if (!id) continue
      if (!isUuid(id)) return empty("Invalid label.")
      label_ids.push(id)
    }
    if (label_ids.length > 30) return empty("Too many labels.")
  }

  let assignee_id: string | null = null
  if (assigneeRaw) {
    if (!isUuid(assigneeRaw)) return empty("Invalid assignee.")
    assignee_id = assigneeRaw
  }

  return { title, description, priority, assignee_id, due_date, label_ids }
}

// Sync a task's label links to exactly `labelIds` (same-team enforced by RLS).
async function syncTaskLabels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string,
  labelIds: string[],
): Promise<string | null> {
  const { data: existing, error: listError } = await supabase
    .from("task_labels")
    .select("label_id")
    .eq("task_id", taskId)
  if (listError) return listError.message

  const current = new Set((existing ?? []).map((link) => link.label_id))
  const target = new Set(labelIds)

  for (const labelId of labelIds) {
    if (current.has(labelId)) continue
    const { error } = await supabase
      .from("task_labels")
      .insert({ task_id: taskId, label_id: labelId })
    if (error) return error.message
  }
  for (const labelId of current) {
    if (target.has(labelId)) continue
    const { error } = await supabase
      .from("task_labels")
      .delete()
      .eq("task_id", taskId)
      .eq("label_id", labelId)
    if (error) return error.message
  }

  return null
}

export async function createTask(
  boardId: string,
  columnId: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  if (!isUuid(boardId)) return { ok: false, message: "Invalid board." }
  if (!isUuid(columnId)) return { ok: false, message: "Invalid column." }

  const parsed = parseTaskInput(formData)
  if (parsed.error) return { ok: false, message: parsed.error }

  const { supabase } = await getCurrentUserOrRedirect()

  const { data: last } = await supabase
    .from("tasks")
    .select("position")
    .eq("column_id", columnId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  const position = last ? last.position + 1 : 1

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      board_id: boardId,
      column_id: columnId,
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority,
      position,
      assignee_id: parsed.assignee_id,
      due_date: parsed.due_date,
    })
    .select(TASK_COLUMNS)
    .single()

  if (error) return { ok: false, message: error.message }

  const syncError = await syncTaskLabels(supabase, data.id, parsed.label_ids)
  if (syncError) return { ok: false, message: syncError }

  revalidatePath("/app", "layout")
  return { ok: true, task: data as TaskPayload, label_ids: parsed.label_ids }
}

export async function updateTask(
  taskId: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  if (!isUuid(taskId)) return { ok: false, message: "Invalid task." }

  const parsed = parseTaskInput(formData)
  if (parsed.error) return { ok: false, message: parsed.error }

  const { supabase } = await getCurrentUserOrRedirect()

  const { data, error } = await supabase
    .from("tasks")
    .update({
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority,
      assignee_id: parsed.assignee_id,
      due_date: parsed.due_date,
    })
    .eq("id", taskId)
    .select(TASK_COLUMNS)
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  if (!data) return { ok: false, message: "Task not found." }

  const syncError = await syncTaskLabels(supabase, taskId, parsed.label_ids)
  if (syncError) return { ok: false, message: syncError }

  revalidatePath("/app", "layout")
  return { ok: true, task: data as TaskPayload, label_ids: parsed.label_ids }
}

export async function deleteTask(taskId: string): Promise<TaskActionResult> {
  if (!isUuid(taskId)) return { ok: false, message: "Invalid task." }

  const { supabase } = await getCurrentUserOrRedirect()

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .select("id")
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  if (!data) return { ok: false, message: "Task not found." }

  revalidatePath("/app", "layout")
  return { ok: true }
}

// Persist a drag-and-drop / keyboard move. Updates the task's column (status
// lane) and its position using midpoint placement so only the moved row is
// rewritten — a single row change means Realtime emits a single event and
// concurrent drags don't clobber whole-column reindexes.
export async function moveTask(
  taskId: string,
  targetColumnId: string,
  targetIndex: number,
): Promise<TaskActionResult> {
  if (!isUuid(taskId) || !isUuid(targetColumnId)) {
    return { ok: false, message: "Invalid task or column." }
  }
  if (!Number.isInteger(targetIndex) || targetIndex < 0) {
    return { ok: false, message: "Invalid position." }
  }

  const { supabase } = await getCurrentUserOrRedirect()

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, column_id, board_id")
    .eq("id", taskId)
    .maybeSingle()
  if (taskError) return { ok: false, message: taskError.message }
  if (!task) return { ok: false, message: "Task not found." }

  const { data: column, error: columnError } = await supabase
    .from("columns")
    .select("id, board_id")
    .eq("id", targetColumnId)
    .maybeSingle()
  if (columnError) return { ok: false, message: columnError.message }
  if (!column) return { ok: false, message: "Column not found." }

  // Never let a task leave its board.
  if (column.board_id !== task.board_id) {
    return { ok: false, message: "Task can only move within its board." }
  }

  const { data: columnTasks, error: listError } = await supabase
    .from("tasks")
    .select("id, position")
    .eq("column_id", targetColumnId)
    .order("position", { ascending: true })
  if (listError) return { ok: false, message: listError.message }

  const others = columnTasks.filter((t) => t.id !== taskId)
  const insertAt = Math.min(targetIndex, others.length)

  let position: number
  if (others.length === 0) {
    position = 1
  } else if (insertAt === 0) {
    position = others[0].position - 1
  } else if (insertAt >= others.length) {
    position = others[others.length - 1].position + 1
  } else {
    position = (others[insertAt - 1].position + others[insertAt].position) / 2
  }

  // Precision guard: if the midpoint no longer sits strictly between its
  // neighbours, reindex the column to 1..n and place the task at insertAt.
  if (insertAt > 0 && insertAt < others.length) {
    const prev = others[insertAt - 1].position
    const next = others[insertAt].position
    if (!(position > prev && position < next)) {
      for (const [index, other] of others.entries()) {
        const { error: reindexError } = await supabase
          .from("tasks")
          .update({ position: index + 1 })
          .eq("id", other.id)
        if (reindexError) return { ok: false, message: reindexError.message }
      }
      position = insertAt + 1
    }
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({ column_id: targetColumnId, position })
    .eq("id", taskId)
    .select(TASK_COLUMNS)
    .single()

  if (error) return { ok: false, message: error.message }

  revalidatePath("/app", "layout")
  return { ok: true, task: data as TaskPayload }
}

// Create a label in the board's team label pool. Reuses an existing label with
// the same case-insensitive name (enforced by labels_team_name_key).
export async function createLabel(
  boardId: string,
  name: string,
  color: string,
): Promise<LabelActionResult> {
  if (!isUuid(boardId)) return { ok: false, message: "Invalid board." }
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, message: "Labels need a name." }
  if (trimmed.length > LABEL_NAME_MAX)
    return { ok: false, message: `Label names are limited to ${LABEL_NAME_MAX} characters.` }
  if (!LABEL_COLORS.includes(color)) return { ok: false, message: "Invalid label color." }

  const { supabase } = await getCurrentUserOrRedirect()
  const teamId = await resolveBoardTeam(supabase, boardId)
  if (!teamId) return { ok: false, message: "Board not found." }

  const { data, error } = await supabase
    .from("labels")
    .insert({ team_id: teamId, name: trimmed, color })
    .select("id, team_id, name, color")
    .maybeSingle()

  if (error) {
    if (error.code === "23505") {
      const { data: teamLabels } = await supabase
        .from("labels")
        .select("id, team_id, name, color")
        .eq("team_id", teamId)
      const existing = teamLabels?.find(
        (label) => label.name.toLowerCase() === trimmed.toLowerCase(),
      )
      if (existing) {
        revalidatePath("/app", "layout")
        return { ok: true, label: existing as LabelPayload }
      }
    }
    return { ok: false, message: error.message }
  }

  revalidatePath("/app", "layout")
  return { ok: true, label: data as LabelPayload }
}

export async function listLabels(boardId: string): Promise<LabelActionResult> {
  if (!isUuid(boardId)) return { ok: false, message: "Invalid board." }

  const { supabase } = await getCurrentUserOrRedirect()
  const teamId = await resolveBoardTeam(supabase, boardId)
  if (!teamId) return { ok: false, message: "Board not found." }

  const { data, error } = await supabase
    .from("labels")
    .select("id, team_id, name, color")
    .eq("team_id", teamId)
    .order("name", { ascending: true })

  if (error) return { ok: false, message: error.message }
  return { ok: true, labels: (data ?? []) as LabelPayload[] }
}

export async function attachLabel(
  taskId: string,
  labelId: string,
): Promise<TaskActionResult> {
  if (!isUuid(taskId) || !isUuid(labelId)) {
    return { ok: false, message: "Invalid task or label." }
  }

  const { supabase } = await getCurrentUserOrRedirect()
  const { error } = await supabase.from("task_labels").upsert(
    { task_id: taskId, label_id: labelId },
    { onConflict: "task_id,label_id", ignoreDuplicates: true },
  )
  if (error) return { ok: false, message: error.message }

  revalidatePath("/app", "layout")
  return { ok: true }
}

export async function detachLabel(
  taskId: string,
  labelId: string,
): Promise<TaskActionResult> {
  if (!isUuid(taskId) || !isUuid(labelId)) {
    return { ok: false, message: "Invalid task or label." }
  }

  const { supabase } = await getCurrentUserOrRedirect()
  const { error } = await supabase
    .from("task_labels")
    .delete()
    .eq("task_id", taskId)
    .eq("label_id", labelId)
  if (error) return { ok: false, message: error.message }

  revalidatePath("/app", "layout")
  return { ok: true }
}