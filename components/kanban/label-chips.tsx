"use client"

import { memo } from "react"

import type { LabelPayload } from "@/lib/tasks/types"
import { getLabelStyle } from "@/components/kanban/label-style"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Compact color-coded label chips with a "+N" overflow. Shared by task cards
// and the list view so both stay visually consistent.
export const LabelChips = memo(function LabelChips({
  labels,
  max = 3,
  className,
}: {
  labels: LabelPayload[]
  max?: number
  className?: string
}) {
  if (labels.length === 0) return null

  const visible = labels.slice(0, max)
  const overflow = labels.slice(max)

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {visible.map((label) => (
        <Tooltip key={label.id}>
          <TooltipTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span
              className={cn(
                "inline-flex max-w-32 items-center gap-1 rounded-full border px-1.5 py-0.5 font-medium",
                getLabelStyle(label.color).chip,
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  getLabelStyle(label.color).swatch,
                )}
              />
              <span className="truncate text-[10px] leading-none">
                {label.name}
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent>{label.name}</TooltipContent>
        </Tooltip>
      ))}
      {overflow.length > 0 ? (
        <Tooltip>
          <TooltipTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              +{overflow.length}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {overflow.map((label) => label.name).join(", ")}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
})