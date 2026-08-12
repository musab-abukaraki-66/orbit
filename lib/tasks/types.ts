export type Priority = "urgent" | "high" | "medium" | "low"

export const PRIORITIES: Priority[] = ["urgent", "high", "medium", "low"]

export type TaskPayload = {
  id: string
  column_id: string
  title: string
  description: string | null
  priority: string
  status: string
  position: number
  assignee_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ColumnPayload = {
  id: string
  name: string
  position: number
}

export type ProfilePayload = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}
