import { memo } from "react"
import { CalendarDays } from "lucide-react"

import type {
  LabelPayload,
  ProfilePayload,
  TaskPayload,
} from "@/lib/tasks/types"
import { getPriorityMeta } from "@/components/kanban/priority"
import { LabelChips } from "@/components/kanban/label-chips"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

function getInitials(name: string | null): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const result = parts.map((part) => part[0]?.toUpperCase() ?? "").join("")
  return result || "?"
}

// Neutral short form ("Aug 20") — never relative, so server-rendered board
// cards can't mismatch the client's clock.
function formatDueDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export const TaskCard = memo(function TaskCard({
  task,
  profile,
  labels,
  actions,
  className,
}: {
  task: TaskPayload
  profile: ProfilePayload | null
  labels?: LabelPayload[]
  actions?: React.ReactNode
  className?: string
}) {
  const priority = getPriorityMeta(task.priority)
  const PriorityIcon = priority.icon
  const labelsForTask = labels ?? []

  return (
    <div
      className={cn(
        "group/card flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2.5 text-sm shadow-xs",
        className,
      )}
    >
      <div className="flex items-start gap-1">
        <p className="line-clamp-2 flex-1 text-[13px] leading-snug font-medium text-card-foreground">
          {task.title}
        </p>
        {actions}
      </div>
      {task.description ? (
        <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
          {task.description}
        </p>
      ) : null}
      <LabelChips labels={labelsForTask} max={3} />
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Tooltip>
            <TooltipTrigger className="flex size-4 items-center justify-center rounded outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <PriorityIcon className={cn("size-3.5", priority.className)} />
            </TooltipTrigger>
            <TooltipContent>Priority: {priority.label}</TooltipContent>
          </Tooltip>
          {task.due_date ? (
            <Tooltip>
              <TooltipTrigger className="rounded outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CalendarDays className="size-3" />
                  {formatDueDate(task.due_date)}
                </span>
              </TooltipTrigger>
              <TooltipContent>Due {formatDueDate(task.due_date)}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        {profile ? (
          <Tooltip>
            <TooltipTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar size="sm" className="size-5">
                <AvatarFallback className="text-[10px]">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              {profile.full_name ?? profile.email}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
})