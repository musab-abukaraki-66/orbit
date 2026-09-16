import { AlertOctagon, Minus, SignalHigh, SignalLow, SignalMedium } from "lucide-react"

import { chipClass, PRIORITY_META, swatchClass, type Priority } from "@/lib/items/types"
import { cn } from "@/lib/utils"

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const meta = PRIORITY_META[priority]
  const cls = cn("size-3.5", meta.className, className)
  switch (priority) {
    case "urgent":
      return <AlertOctagon className={cls} aria-label="Urgent" />
    case "high":
      return <SignalHigh className={cls} aria-label="High priority" />
    case "medium":
      return <SignalMedium className={cls} aria-label="Medium priority" />
    case "low":
      return <SignalLow className={cls} aria-label="Low priority" />
    default:
      return <Minus className={cls} aria-label="No priority" />
  }
}

export function StatusDot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", swatchClass(color), className)} />
}

export function LabelChip({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded-full border px-1.5 text-[11px] font-medium", chipClass(color), className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", swatchClass(color))} />
      {name}
    </span>
  )
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return null
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
