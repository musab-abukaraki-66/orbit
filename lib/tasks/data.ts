import { createClient } from "@/lib/supabase/server"
import type {
  LabelPayload,
  TaskLabelIdsByTask,
  TaskPayload,
} from "@/lib/tasks/types"

const TASK_COLUMNS_SELECT =
  "id, column_id, title, description, priority, status, position, assignee_id, due_date, created_by, created_at, updated_at"

export async function getTasksForBoard(boardId: string): Promise<TaskPayload[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS_SELECT)
    .eq("board_id", boardId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })

  return (data ?? []) as TaskPayload[]
}

// Team labels usable on this board plus the label->task links that already
// exist. The board's team is resolved through board -> workspace so a user
// (possibly in several teams) gets exactly this board's label pool.
export async function getBoardLabels(
  boardId: string,
): Promise<{ labels: LabelPayload[]; byTask: TaskLabelIdsByTask }> {
  const supabase = await createClient()

  const { data: board } = await supabase
    .from("boards")
    .select("workspace_id")
    .eq("id", boardId)
    .maybeSingle()
  if (!board) return { labels: [], byTask: {} }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("team_id")
    .eq("id", board.workspace_id)
    .maybeSingle()
  if (!workspace) return { labels: [], byTask: {} }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("board_id", boardId)
  const taskIds = (tasks ?? []).map((task) => task.id)

  const { data: labels } = await supabase
    .from("labels")
    .select("id, team_id, name, color")
    .eq("team_id", workspace.team_id)
    .order("name", { ascending: true })

  let links: { data: { task_id: string; label_id: string }[] | null } | null = null
  if (taskIds.length > 0) {
    const res = await supabase
      .from("task_labels")
      .select("task_id, label_id")
      .in("task_id", taskIds)
    links = { data: res.data }
  }

  const byTask: TaskLabelIdsByTask = {}
  for (const link of (links?.data ?? []) as {
    task_id: string
    label_id: string
  }[]) {
    ;(byTask[link.task_id] ??= []).push(link.label_id)
  }
  // Deterministic ordering for stable chips / list rows.
  const labelOrder = new Map((labels ?? []).map((label, index) => [label.id, index]))
  for (const taskId of Object.keys(byTask)) {
    byTask[taskId].sort(
      (a, b) => (labelOrder.get(a) ?? 0) - (labelOrder.get(b) ?? 0),
    )
  }

  return { labels: (labels ?? []) as LabelPayload[], byTask }
}

export async function getTaskCountsByBoard(
  boardIds: string[],
): Promise<Map<string, number>> {
  if (boardIds.length === 0) return new Map()

  const supabase = await createClient()
  const { data } = await supabase
    .from("tasks")
    .select("board_id")
    .in("board_id", boardIds)

  const counts = new Map<string, number>()
  for (const task of data ?? []) {
    counts.set(task.board_id, (counts.get(task.board_id) ?? 0) + 1)
  }

  return counts
}