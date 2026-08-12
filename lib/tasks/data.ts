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
