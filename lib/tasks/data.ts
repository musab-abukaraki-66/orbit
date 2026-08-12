import { createClient } from "@/lib/supabase/server"
import type { TaskPayload } from "@/lib/tasks/types"

export async function getTasksForBoard(boardId: string): Promise<TaskPayload[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("tasks")
    .select(
      "id, column_id, title, description, priority, status, position, assignee_id, created_by, created_at, updated_at",
    )
    .eq("board_id", boardId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })

  return (data ?? []) as TaskPayload[]
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
