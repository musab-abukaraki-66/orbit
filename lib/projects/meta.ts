import type { Database } from "@/lib/supabase/database.types"

export type ProjectStatus = Database["public"]["Enums"]["project_status"]
export type ProjectHealth = Database["public"]["Enums"]["project_health"]

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; className: string }> = {
  backlog: { label: "Backlog", className: "bg-muted text-muted-foreground" },
  planned: { label: "Planned", className: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  in_progress: { label: "In progress", className: "bg-brand/15 text-brand" },
  completed: { label: "Completed", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  canceled: { label: "Canceled", className: "bg-muted text-muted-foreground line-through" },
}

export const PROJECT_HEALTH_META: Record<ProjectHealth, { label: string; dot: string; className: string }> = {
  on_track: { label: "On track", dot: "bg-emerald-500", className: "text-emerald-600 dark:text-emerald-400" },
  at_risk: { label: "At risk", dot: "bg-amber-500", className: "text-amber-600 dark:text-amber-400" },
  off_track: { label: "Off track", dot: "bg-red-500", className: "text-red-600 dark:text-red-400" },
}

