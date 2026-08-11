import { createClient } from "@/lib/supabase/server"

export async function getBoardsForWorkspace(workspaceId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("boards")
    .select("id, name, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })

  return data ?? []
}

export async function getBoardById(boardId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("boards")
    .select("id, name, workspace_id, created_at, updated_at")
    .eq("id", boardId)
    .maybeSingle()

  return data
}

export async function getColumnsForBoard(boardId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("columns")
    .select("id, name, position")
    .eq("board_id", boardId)
    .order("position", { ascending: true })

  return data ?? []
}
