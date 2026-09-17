import {
  Activity,
  Bell,
  CalendarDays,
  ChevronsUpDown,
  CircleUserRound,
  Command,
  FolderKanban,
  Inbox,
  Kanban,
  LayoutList,
  Megaphone,
  MessageSquare,
  PanelsTopLeft,
  Plus,
  Search,
  Settings,
  Sparkles,
  Wifi,
} from "lucide-react"

import type { Priority } from "@/lib/items/types"
import { cn } from "@/lib/utils"
import { LabelChip, PriorityIcon, StatusDot } from "@/components/items/meta"
import { OrbitMark } from "@/components/orbit-mark"

// A static, aria-hidden rendition of a real Orbit project board: the same
// sidebar sections, project tabs, status columns and card anatomy as the app,
// with sample data. Reuses the app's own chip/priority/status primitives so the
// preview drifts less from the product.

type MockCard = {
  key: string
  title: string
  priority: Priority
  labels?: { name: string; color: string }[]
  due?: string
  comments?: number
  assignee?: { initials: string; name: string }
  mine?: boolean
  role?: "source" | "target"
}

const COLUMNS: { name: string; color: string; cards: MockCard[] }[] = [
  {
    name: "Backlog",
    color: "slate",
    cards: [
      { key: "WEB-21", title: "Audit accessibility on checkout", priority: "medium", labels: [{ name: "a11y", color: "teal" }] },
      { key: "WEB-19", title: "Collect testimonials for pricing page", priority: "low", assignee: { initials: "SK", name: "Sam" } },
    ],
  },
  {
    name: "Todo",
    color: "sky",
    cards: [
      { key: "WEB-18", title: "Write copy for the new homepage hero", priority: "high", labels: [{ name: "Content", color: "amber" }], due: "Sep 24", assignee: { initials: "LB", name: "Lena" } },
      { key: "WEB-17", title: "Set up staging environment", priority: "medium", labels: [{ name: "Infra", color: "violet" }], comments: 2 },
      { key: "WEB-16", title: "Design empty states", priority: "low", assignee: { initials: "AK", name: "Ana" } },
    ],
  },
  {
    name: "In Progress",
    color: "violet",
    cards: [
      { key: "WEB-15", title: "Responsive navigation and mobile menu", priority: "urgent", labels: [{ name: "Frontend", color: "blue" }], due: "Sep 19", comments: 4, assignee: { initials: "M", name: "You" }, mine: true, role: "source" },
      { key: "WEB-14", title: "Migrate blog posts to the new CMS", priority: "high", labels: [{ name: "Content", color: "amber" }], comments: 1, assignee: { initials: "SK", name: "Sam" } },
    ],
  },
  {
    name: "Done",
    color: "emerald",
    cards: [
      { key: "WEB-12", title: "Brand refresh: logo, colors, type scale", priority: "high", labels: [{ name: "Design", color: "pink" }], assignee: { initials: "AK", name: "Ana" }, role: "target" },
      { key: "WEB-9", title: "Kickoff and project brief", priority: "medium", comments: 3, assignee: { initials: "LB", name: "Lena" } },
    ],
  },
]

const NAV = [
  { label: "Pulse", icon: Activity },
  { label: "My work", icon: CircleUserRound },
  { label: "Inbox", icon: Inbox, badge: 3 },
  { label: "Projects", icon: FolderKanban },
]

const PROJECTS = [
  { name: "Website Redesign", color: "violet", active: true },
  { name: "Mobile app v2", color: "sky", active: false },
  { name: "Q4 launch", color: "amber", active: false },
]

const TABS = [
  { label: "Board", icon: Kanban, active: true },
  { label: "List", icon: LayoutList, active: false },
  { label: "Overview", icon: PanelsTopLeft, active: false },
  { label: "Updates", icon: Megaphone, active: false },
]

function MockAvatar({ initials, mine, className }: { initials: string; mine?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-medium text-muted-foreground",
        mine && "bg-brand/15 text-brand ring-1 ring-brand",
        className,
      )}
    >
      {initials}
    </span>
  )
}

function Card({ card, ghost }: { card: MockCard; ghost?: boolean }) {
  return (
    <div
      data-mock-card={ghost ? undefined : ""}
      data-drag-source={card.role === "source" && !ghost ? "" : undefined}
      data-drag-target={card.role === "target" && !ghost ? "" : undefined}
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border border-border/70 bg-card px-2 py-1.5 shadow-xs",
        ghost && "border-brand/40 shadow-lg shadow-brand/25",
      )}
    >
      <div className="flex items-start gap-1.5">
        <span className="pt-px font-mono text-[9px] text-muted-foreground">{card.key}</span>
        <p className="line-clamp-2 flex-1 text-[10px] leading-snug font-medium">{card.title}</p>
      </div>
      {card.labels?.length ? (
        <div className="flex flex-wrap gap-1">
          {card.labels.map((label) => (
            <LabelChip key={label.name} name={label.name} color={label.color} className="h-4 px-1 text-[8px]" />
          ))}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <PriorityIcon priority={card.priority} className="size-3" />
          {card.due ? (
            <span className="flex items-center gap-0.5 text-[9px]">
              <CalendarDays className="size-2.5" />
              {card.due}
            </span>
          ) : null}
          {card.comments ? (
            <span className="flex items-center gap-0.5 text-[9px]">
              <MessageSquare className="size-2.5" />
              {card.comments}
            </span>
          ) : null}
        </div>
        {card.assignee ? (
          <span className={cn("flex items-center gap-1 rounded-full pr-1 text-[9px] text-muted-foreground", card.mine && "bg-brand/15 text-brand")}>
            <MockAvatar initials={card.assignee.initials} mine={card.mine} />
            {card.assignee.name}
          </span>
        ) : (
          <span className="size-4 rounded-full border border-dashed border-border" />
        )}
      </div>
    </div>
  )
}

export function OrbitHeroVisual() {
  const source = COLUMNS.flatMap((column) => column.cards).find((card) => card.role === "source")!
  const taskCount = COLUMNS.reduce((sum, column) => sum + column.cards.length, 0)

  return (
    <div data-hero-mockup aria-hidden="true" className="relative mx-auto w-full max-w-5xl select-none">
      <div className="absolute -inset-6 rounded-[3rem] bg-brand/10 blur-3xl sm:-inset-10" />

      <div className="relative flex overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl ring-1 ring-foreground/5">
        {/* Sidebar */}
        <aside className="hidden w-44 shrink-0 flex-col border-r bg-muted/30 md:flex">
          <div className="flex items-center gap-2 border-b px-3 py-2.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-brand text-[11px] font-semibold text-white">A</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium">Acme Digital</p>
              <p className="truncate text-[9px] text-muted-foreground">Owner</p>
            </div>
            <ChevronsUpDown className="size-3 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-0.5 p-2">
            {NAV.map((item) => (
              <div key={item.label} className="flex items-center gap-2 rounded-md px-2 py-1 text-[11px] text-muted-foreground">
                <item.icon className="size-3.5" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? <span className="rounded-full bg-brand px-1.5 text-[9px] font-medium text-white">{item.badge}</span> : null}
              </div>
            ))}
          </div>
          <div className="px-2">
            <div className="flex items-center justify-between px-2 pt-1 pb-1 text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
              Projects
              <Plus className="size-3" />
            </div>
            <div className="flex flex-col gap-0.5">
              {PROJECTS.map((project) => (
                <div
                  key={project.name}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1 text-[11px]",
                    project.active ? "bg-background font-medium shadow-xs" : "text-muted-foreground",
                  )}
                >
                  <StatusDot color={project.color} className="size-1.5" />
                  <span className="truncate">{project.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-auto flex flex-col gap-0.5 border-t p-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2 px-2 py-1">
              <Sparkles className="size-3.5 text-brand" />
              <span className="flex-1">Orbit AI</span>
              <span className="rounded border px-1 text-[8px] uppercase">Preview</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1">
              <Settings className="size-3.5" />
              Settings
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <OrbitMark className="size-4 shrink-0 text-brand md:hidden" />
            <div className="flex h-6 flex-1 items-center gap-1.5 rounded-md border bg-muted/40 px-2 text-[10px] text-muted-foreground sm:max-w-xs">
              <Search className="size-3" />
              <span className="truncate">Search tasks, projects, people…</span>
              <span className="ml-auto hidden items-center gap-0.5 rounded border bg-background px-1 font-mono text-[9px] sm:flex">
                <Command className="size-2.5" />K
              </span>
            </div>
            <span className="ml-auto flex items-center gap-2 text-muted-foreground">
              <Bell className="size-3.5" />
              <MockAvatar initials="M" mine className="size-5 text-[9px]" />
            </span>
          </div>

          <div className="flex flex-col gap-2 border-b px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-1.5">
                <StatusDot color="violet" />
                <span className="text-[13px] font-semibold tracking-tight">Website Redesign</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                On track
              </span>
              <span className="hidden text-[10px] text-muted-foreground sm:inline">Lead: Ana K. · Target Oct 15 · 62%</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                <Wifi className="size-2.5" />
                <span className="size-1 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
                Live
              </span>
            </div>
            <div className="flex items-center gap-1">
              {TABS.map((tab) => (
                <span
                  key={tab.label}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]",
                    tab.active ? "bg-muted font-medium" : "text-muted-foreground",
                    !tab.active && tab.label !== "List" && "hidden sm:flex",
                  )}
                >
                  <tab.icon className="size-3" />
                  {tab.label}
                </span>
              ))}
              <span className="ml-auto flex -space-x-1">
                {["AK", "SK", "LB"].map((initials) => (
                  <MockAvatar key={initials} initials={initials} className="size-5 ring-2 ring-card" />
                ))}
              </span>
              <span className="flex items-center gap-0.5 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-medium text-primary-foreground">
                <Plus className="size-2.5" />
                New task
              </span>
            </div>
          </div>

          <div data-drag-area className="relative flex items-start gap-2 p-3">
            {COLUMNS.map((column, index) => (
              <div
                key={column.name}
                className={cn(
                  "flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg bg-muted/40 p-1.5",
                  index < 2 && "hidden sm:flex",
                )}
              >
                <div className="flex items-center gap-1.5 px-1 pb-0.5">
                  <StatusDot color={column.color} className="size-1.5" />
                  <span className="truncate text-[10px] font-medium">{column.name}</span>
                  <span className="ml-auto font-mono text-[9px] text-muted-foreground">{column.cards.length}</span>
                </div>
                {column.cards.map((card) => (
                  <Card key={card.key} card={card} />
                ))}
                <span className="flex items-center gap-1 px-1 pt-0.5 text-[9px] text-muted-foreground">
                  <Plus className="size-2.5" />
                  Add task
                </span>
              </div>
            ))}

            <div data-drag-card className="pointer-events-none absolute top-0 left-0 z-10 w-40 opacity-0">
              <Card card={source} ghost />
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between border-t px-3 py-1.5 font-mono text-[9px] text-muted-foreground">
            <span>{taskCount} tasks · 4 members</span>
            <span>Updated just now</span>
          </div>
        </div>
      </div>
    </div>
  )
}
