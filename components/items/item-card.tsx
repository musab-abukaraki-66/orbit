"use client"

import { CalendarDays, MessageSquare } from "lucide-react"

import { isOverdue, type ItemPayload, type LabelRow, type ProfileLite } from "@/lib/items/types"
import { memberLabel } from "@/lib/members/format"
import { cn } from "@/lib/utils"
import { formatShortDate, LabelChip, PriorityIcon } from "@/components/items/meta"
import { UserAvatar } from "@/components/user-avatar"

export function ItemCard({
  item,
  assignee,
  labels,
  commentCount,
  onOpen,
  className,
  dragging,
}: {
  item: ItemPayload
  assignee: ProfileLite | null
  labels: LabelRow[]
  commentCount?: number
  onOpen?: () => void
  className?: string
  dragging?: boolean
}) {
  const overdue = isOverdue(item)
  const due = formatShortDate(item.due_date)
  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (onOpen && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        "group/card flex flex-col gap-2 rounded-lg border border-border/70 bg-card px-3 py-2.5 text-sm shadow-xs outline-none transition-colors",
        onOpen && "cursor-pointer hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring",
        dragging && "rotate-1 shadow-xl ring-1 ring-foreground/10",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <span className="pt-px font-mono text-[11px] text-muted-foreground">{item.key}</span>
        <p className="line-clamp-2 flex-1 text-[13px] leading-snug font-medium text-card-foreground">{item.title}</p>
      </div>
      {labels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {labels.slice(0, 3).map((label) => (
            <LabelChip key={label.id} name={label.name} color={label.color} />
          ))}
          {labels.length > 3 ? <span className="text-[11px] text-muted-foreground">+{labels.length - 3}</span> : null}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <PriorityIcon priority={item.priority} />
          {due ? (
            <span className={cn("flex items-center gap-1 text-[11px]", overdue && "text-red-500")}>
              <CalendarDays className="size-3" />
              {due}
            </span>
          ) : null}
          {commentCount ? (
            <span className="flex items-center gap-1 text-[11px]">
              <MessageSquare className="size-3" />
              {commentCount}
            </span>
          ) : null}
        </div>
        {assignee ? (
          <UserAvatar name={memberLabel(assignee)} avatarUrl={assignee.avatar_url} className="size-5" fallbackClassName="text-[9px]" />
        ) : (
          <span className="size-5 rounded-full border border-dashed border-border" aria-label="Unassigned" />
        )}
      </div>
    </div>
  )
}
