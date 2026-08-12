"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import type { TaskPayload } from "@/lib/tasks/types"

export type TaskFormState =
  | {
      ok: boolean
      message?: string
      task?: TaskPayload
    }
  | undefined

export type TaskActionResult = {
  ok: boolean
  message?: string
  task?: TaskPayload
}

const PRIORITIES = ["low", "medium", "high", "urgent"]
const TITLE_MAX = 200
const DESCRIPTION_MAX = 10_000

const TASK_COLUMNS =
  "id, column_id, title, description, priority, status, position, assignee_id, created_by, created_at, updated_at"

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

function parseTaskInput(formData: FormData): {
  title: string
  description: string | null
  priority: string
  assignee_id: string | null
  error?: string
} {
  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim() || null
  const priority = String(formData.get("priority") ?? "medium")
  const assigneeRaw = String(formData.get("assignee_id") ?? "").trim()

  if (!title) return { title: "", description: null, priority: "", assignee_id: null, error: "Please give your task a title." }
  if (title.length > TITLE_MAX)
    return { title: "", description: null, priority: "", assignee_id: null, error: `Task titles are limited to ${TITLE_MAX} characters.` }
  if (description && description.length > DESCRIPTION_MAX)
    return { title: "", description: null, priority: "", assignee_id: null, error: "Task descriptions are too long." }
  if (!PRIORITIES.includes(priority))
    return { title: "", description: null, priority: "", assignee_id: null, error: "Invalid priority." }

  let assignee_id: string | null = null
  if (assigneeRaw) {
    if (!isUuid(assigneeRaw))
      return { title: "", description: null, priority: "", assignee_id: null, error: "Invalid assignee." }
    assignee_id = assigneeRaw
  }

  return { title, description, priority, assignee_id }
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
    })
    .select(TASK_COLUMNS)
    .single()

  if (error) return { ok: false, message: error.message }

  revalidatePath("/app", "layout")
  return { ok: true, task: data as TaskPayload }
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
    })
    .eq("id", taskId)
    .select(TASK_COLUMNS)
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  if (!data) return { ok: false, message: "Task not found." }

  revalidatePath("/app", "layout")
  return { ok: true, task: data as TaskPayload }
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
