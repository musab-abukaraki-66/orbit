import Link from "next/link"
import { CalendarDays, Kanban, LayoutList, Megaphone, PanelsTopLeft } from "lucide-react"

import type { ProjectStatus } from "@/lib/projects/meta"
import { PROJECT_HEALTH_META, PROJECT_STATUS_META, type ProjectHealth } from "@/lib/projects/meta"
import { memberLabel } from "@/lib/members/format"
import { cn } from "@/lib/utils"
import { ProjectMenu } from "@/components/projects/project-menu"
import { formatDate } from "@/components/projects/project-card"
import { UserAvatar } from "@/components/user-avatar"

export function ProjectHeader({
  slug,
  project,
  active,
  members,
  currentUserId,
  isAdmin,
  progress,
}: {
  slug: string
  project: {
    id: string
    name: string
    slug: string
    description: string | null
    status: ProjectStatus
    health: ProjectHealth
    lead_id: string | null
    target_date: string | null
    archived_at: string | null
    lead: { id: string; full_name: string | null; email: string | null; avatar_url: string | null } | null
  }
  active: "board" | "list" | "overview" | "updates"
  members: { id: string; full_name: string | null; email: string | null }[]
  currentUserId: string
  isAdmin: boolean
  progress: { completed: number; total: number }
}) {
  const base = `/w/${slug}/projects/${project.slug}`
  const status = PROJECT_STATUS_META[project.status]
  const health = PROJECT_HEALTH_META[project.health]
  const pct = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0
  const tabs = [
    { key: "board", label: "Board", href: base, icon: Kanban },
    { key: "list", label: "List", href: `${base}/list`, icon: LayoutList },
    { key: "overview", label: "Overview", href: `${base}/overview`, icon: PanelsTopLeft },
    { key: "updates", label: "Updates", href: `${base}/updates`, icon: Megaphone },
  ] as const

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">{project.name}</h1>
            <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium", status.className)}>{status.label}</span>
            {project.archived_at ? <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-[11px] font-medium text-muted-foreground">Archived</span> : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className={cn("size-1.5 rounded-full", health.dot)} />
              <span className={health.className}>{health.label}</span>
            </span>
            <span className="tabular-nums">{pct}% done · {progress.completed}/{progress.total}</span>
            {project.lead ? (
              <span className="flex items-center gap-1.5">
                <UserAvatar name={memberLabel(project.lead)} avatarUrl={project.lead.avatar_url} className="size-4" fallbackClassName="text-[8px]" />
                Lead: {memberLabel(project.lead)}
              </span>
            ) : null}
            {project.target_date ? (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                Target {formatDate(project.target_date)}
              </span>
            ) : null}
          </div>
        </div>
        <ProjectMenu slug={slug} project={project} members={members} currentUserId={currentUserId} canEdit={isAdmin || project.lead_id === currentUserId} canDelete={isAdmin} />
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <nav aria-label="Project views" className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active === tab.key ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active === tab.key ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
