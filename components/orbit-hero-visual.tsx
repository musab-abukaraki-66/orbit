import {
  ChevronDown,
  ChevronsUp,
  ChevronUp,
  Command,
  Minus,
  Plus,
  Wifi,
  type LucideIcon,
} from "lucide-react"

import { OrbitMark } from "@/components/orbit-mark"
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"

const PRIORITY_STYLE: Record<string, { icon: LucideIcon; className: string }> =
  {
    urgent: { icon: ChevronsUp, className: "text-red-500" },
    high: { icon: ChevronUp, className: "text-orange-500" },
    medium: { icon: Minus, className: "text-amber-500" },
    low: { icon: ChevronDown, className: "text-sky-500" },
  }

const COLUMNS = [
  {
    name: "Backlog",
    dot: "bg-muted-foreground/70",
    tasks: [
      {
        title: "Draft PRD for M7 billing tiers",
        priority: "high",
        assignee: null,
      },
      {
        title: "Research competitor onboarding flows",
        priority: "medium",
        assignee: null,
      },
    ],
  },
  {
    name: "Todo",
    dot: "bg-sky-500",
    tasks: [
      {
        title: "Keyboard shortcuts for board navigation",
        priority: "high",
        assignee: "JD",
      },
      {
        title: "Persist theme choice",
        priority: "medium",
        assignee: null,
      },
      {
        title: "Fix sidebar collapse flicker",
        priority: "medium",
        assignee: null,
      },
    ],
  },
  {
    name: "In Progress",
    dot: "bg-brand",
    tasks: [
      {
        title: "Drag-and-drop between columns",
        priority: "urgent",
        assignee: "MR",
      },
      {
        title: "Supabase Realtime board subscription",
        priority: "high",
        assignee: null,
      },
      {
        title: "Task edit dialog",
        priority: "high",
        assignee: "JL",
      },
    ],
  },
  {
    name: "Done",
    dot: "bg-emerald-500",
    tasks: [
      {
        title: "Project scaffold on Next.js 16",
        priority: "high",
        assignee: null,
      },
      {
        title: "Team creation onboarding flow",
        priority: "medium",
        assignee: "MR",
      },
    ],
  },
]

export function OrbitHeroVisual() {
  return (
    <div
      data-hero-mockup
      aria-hidden="true"
      className="relative mx-auto w-full max-w-lg select-none"
    >
      <div className="absolute -inset-8 rounded-[3rem] bg-brand/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-xl border bg-card shadow-2xl ring-1 ring-foreground/5">
        <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <OrbitMark className="size-4 shrink-0 text-brand" />
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              orbit.app/boards/orbit-board
            </span>
          </div>
          <span className="hidden items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex">
            <Command className="size-3" />
            K
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
          <span className="hidden truncate text-[11px] text-muted-foreground sm:block">
            Drag cards between columns to update their status and position.
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
            <Wifi className="size-3" />
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
            Live
          </span>
        </div>

        <div
          data-drag-area
          className="relative flex items-start gap-2 p-3"
        >
          {COLUMNS.map((column) => (
            <div
              key={column.name}
              className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg bg-muted/40 p-2"
            >
              <div className="flex items-center gap-1.5 px-0.5 pb-1">
                <span
                  className={column.dot + " size-1.5 shrink-0 rounded-full"}
                />
                <span className="truncate text-[11px] font-medium">
                  {column.name}
                </span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {column.tasks.length}
                </span>
              </div>
              {column.tasks.map((task) => {
                const priority = PRIORITY_STYLE[task.priority]
                const PriorityIcon = priority.icon
                return (
                  <div
                    key={task.title}
                    data-mock-card
                    className="rounded-md border border-border/60 bg-card px-2 py-1.5 shadow-xs"
                  >
                    <p className="truncate text-[11px] leading-snug font-medium">
                      {task.title}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <PriorityIcon
                        className={`size-3 ${priority.className}`}
                      />
                      {task.assignee ? (
                        <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[8px] font-medium text-muted-foreground">
                          {task.assignee}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
              <span className="mt-auto flex items-center gap-1 px-1 pt-1 text-[10px] text-muted-foreground">
                <Plus className="size-3" />
                New task
              </span>
            </div>
          ))}

          <div
            data-drag-card
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-10 rounded-md border border-brand/40 bg-card px-2 py-1.5 opacity-0 shadow-lg shadow-brand/25"
          >
            <p className="truncate text-[11px] leading-snug font-medium">
              Drag-and-drop between columns
            </p>
            <div className="mt-1.5 flex items-center justify-between">
              <ChevronsUp className="size-3 text-red-500" />
              <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[8px] font-medium text-muted-foreground">
                MR
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-3 py-2">
          <AvatarGroup>
            <Avatar size="sm" className="size-5">
              <AvatarFallback className="text-[8px]">MR</AvatarFallback>
            </Avatar>
            <Avatar size="sm" className="size-5">
              <AvatarFallback className="text-[8px]">AK</AvatarFallback>
            </Avatar>
            <Avatar size="sm" className="size-5">
              <AvatarFallback className="text-[8px]">JL</AvatarFallback>
            </Avatar>
          </AvatarGroup>
          <span className="font-mono text-[10px] text-muted-foreground">
            12 tasks - 3 members
          </span>
        </div>
      </div>
    </div>
  )
}
