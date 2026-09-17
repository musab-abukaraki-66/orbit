import type { Database } from "@/lib/supabase/database.types"

export type ItemRow = Database["public"]["Tables"]["work_items"]["Row"]
export type StatusRow = Database["public"]["Tables"]["statuses"]["Row"]
export type LabelRow = Database["public"]["Tables"]["labels"]["Row"]
export type Priority = Database["public"]["Enums"]["item_priority"]
export type StatusCategory = Database["public"]["Enums"]["status_category"]

export type ProfileLite = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

export type ItemPayload = ItemRow & {
  label_ids: string[]
}

export type CommentRow = {
  id: string
  work_item_id: string
  author_id: string | null
  body: string
  mentions: string[]
  edited_at: string | null
  created_at: string
}

export type ActivityRow = {
  id: number
  actor_id: string | null
  project_id: string | null
  work_item_id: string | null
  comment_id: string | null
  action: string
  data: Record<string, unknown>
  created_at: string
}

export const PRIORITY_ORDER: Priority[] = ["urgent", "high", "medium", "low", "none"]

export const PRIORITY_META: Record<Priority, { label: string; className: string; rank: number }> = {
  urgent: { label: "Urgent", className: "text-red-500", rank: 0 },
  high: { label: "High", className: "text-orange-500", rank: 1 },
  medium: { label: "Medium", className: "text-amber-500", rank: 2 },
  low: { label: "Low", className: "text-sky-500", rank: 3 },
  none: { label: "No priority", className: "text-muted-foreground", rank: 4 },
}

export const CATEGORY_LABEL: Record<StatusCategory, string> = {
  backlog: "Backlog",
  unstarted: "Unstarted",
  started: "Started",
  completed: "Completed",
  canceled: "Canceled",
}

export const COLOR_SWATCH: Record<string, string> = {
  slate: "bg-slate-400",
  zinc: "bg-zinc-400",
  gray: "bg-gray-400",
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-400",
  lime: "bg-lime-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
}

export const COLOR_CHIP: Record<string, string> = {
  slate: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  zinc: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  gray: "border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-300",
  red: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  orange: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  lime: "border-lime-500/30 bg-lime-500/10 text-lime-700 dark:text-lime-300",
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  teal: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  sky: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  violet: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  purple: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  pink: "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  rose: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
}

export const COLOR_NAMES = Object.keys(COLOR_SWATCH)

export function swatchClass(color: string) {
  return COLOR_SWATCH[color] ?? COLOR_SWATCH.slate
}

export function chipClass(color: string) {
  return COLOR_CHIP[color] ?? COLOR_CHIP.slate
}

export function isOverdue(item: { due_date: string | null; completed_at: string | null }, today = new Date().toISOString().slice(0, 10)) {
  return Boolean(item.due_date && !item.completed_at && item.due_date < today)
}

export function todayIso(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10)
}
