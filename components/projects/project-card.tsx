import Link from "next/link"
import { CalendarDays } from "lucide-react"

import type { ProjectSummary } from "@/lib/projects/data"
import { PROJECT_HEALTH_META, PROJECT_STATUS_META } from "@/lib/projects/meta"
import { memberLabel } from "@/lib/members/format"
import { cn } from "@/lib/utils"
import { UserAvatar } from "@/components/user-avatar"
import { Card, CardContent } from "@/components/ui/card"

export function formatDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function ProjectCard({ project, slug }: { project: ProjectSummary; slug: string }) {
  const status = PROJECT_STATUS_META[project.status]
  const health = PROJECT_HEALTH_META[project.health]
  const target = formatDate(project.target_date)
  const overdueTarget = project.target_date && project.target_date < new Date().toISOString().slice(0, 10) && project.status !== "completed"

  return (
    <Card size="sm" className="transition-colors hover:ring-foreground/25">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/w/${slug}/projects/${project.slug}`} className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="line-clamp-1 text-sm font-semibold">{project.name}</span>
            {project.description ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{project.description}</p> : null}
          </Link>
          <span className={cn("inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-medium", status.className)}>{status.label}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className={cn("size-1.5 rounded-full", health.dot)} />
              <span className={health.className}>{health.label}</span>
            </span>
            <span className="tabular-nums">
              {project.completed}/{project.total} done · {project.progress}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${project.progress}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            {project.lead ? (
              <>
                <UserAvatar name={memberLabel(project.lead)} avatarUrl={project.lead.avatar_url} className="size-5" />
                <span className="truncate">{memberLabel(project.lead)}</span>
              </>
            ) : (
              <span>No lead</span>
            )}
          </span>
          <span className="flex items-center gap-2">
            {project.overdue > 0 ? <span className="text-red-500">{project.overdue} overdue</span> : null}
            {target ? (
              <span className={cn("flex items-center gap-1", overdueTarget && "text-amber-500")}>
                <CalendarDays className="size-3.5" />
                {target}
              </span>
            ) : null}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
