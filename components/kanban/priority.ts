import {
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  Minus,
  type LucideIcon,
} from "lucide-react"

import type { Priority } from "@/lib/tasks/types"

export const PRIORITY_META: Record<
  Priority,
  { label: string; icon: LucideIcon; className: string }
> = {
  urgent: { label: "Urgent", icon: ChevronsUp, className: "text-red-500" },
  high: { label: "High", icon: ChevronUp, className: "text-orange-500" },
  medium: { label: "Medium", icon: Minus, className: "text-amber-500" },
  low: { label: "Low", icon: ChevronDown, className: "text-sky-500" },
}

export function getPriorityMeta(priority: string) {
  return PRIORITY_META[priority as Priority] ?? PRIORITY_META.medium
}

export const DEFAULT_PRIORITY: Priority = "medium"

export function isPriority(value: string): value is Priority {
  return value in PRIORITY_META
}
