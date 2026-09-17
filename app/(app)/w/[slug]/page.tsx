import type { Metadata } from "next"
import Link from "next/link"
import { AlertTriangle, ArrowRight, CircleUserRound, FolderKanban, Users } from "lucide-react"

import { firstNameOf, requireUser } from "@/lib/auth/session"
import { getItemsForWorkspace, getProfilesForWorkspace, getRecentActivity, getStatusesForWorkspace } from "@/lib/items/data"
import { isOverdue } from "@/lib/items/types"
import { memberLabel } from "@/lib/members/data"
import { getProjects, PROJECT_HEALTH_META } from "@/lib/projects/data"
import { requireWorkspace } from "@/lib/workspaces/context"
import { ActivityFeed } from "@/components/items/activity-feed"
import { formatShortDate, PriorityIcon, StatusDot, timeAgo } from "@/components/items/meta"
import { WelcomeTour } from "@/components/onboarding/welcome-tour"
import { LiveRefresh } from "@/components/realtime/use-live-refresh"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { hasCompletedOnboardingTour } from "@/lib/onboarding/tour"

export const metadata: Metadata = { title: "Pulse" }

export default async function PulsePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ welcome?: string }> }) {
  const { slug } = await params
  const { welcome } = await searchParams
  const context = await requireWorkspace(slug)
  const user = await requireUser()
  const [projects, items, statuses, profiles, activity] = await Promise.all([
    getProjects(context.id),
    getItemsForWorkspace(context.id),
    getStatusesForWorkspace(context.id),
    getProfilesForWorkspace(context.id),
    getRecentActivity(context.id, 25),
  ])

  const statusById = new Map(statuses.map((s) => [s.id, s]))
  const projectById = new Map(projects.map((p) => [p.id, p]))
  const projectSlugs = Object.fromEntries(projects.map((p) => [p.id, p.slug]))
  const open = items.filter((i) => {
    const c = statusById.get(i.status_id)?.category
    return c !== "completed" && c !== "canceled"
  })
  const inProgress = open.filter((i) => statusById.get(i.status_id)?.category === "started")
  const overdue = open.filter((i) => isOverdue(i))
  const mine = open.filter((i) => i.assignee_id === context.userId)
  const activeProjects = projects.filter((p) => p.status === "in_progress" || p.status === "planned")
  const showTour = welcome === "1" || !hasCompletedOnboardingTour(user)
  const firstProject = activeProjects[0] ?? projects[0] ?? null

  const byPerson = profiles
    .map((profile) => {
      const theirs = inProgress.filter((i) => i.assignee_id === profile.id).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      const openCount = open.filter((i) => i.assignee_id === profile.id).length
      const lastActivity = activity.find((a) => a.actor_id === profile.id)?.created_at ?? null
      return { profile, theirs, openCount, lastActivity }
    })
    .sort((a, b) => b.theirs.length - a.theirs.length || b.openCount - a.openCount)

  const stats = [
    { label: "Active projects", value: activeProjects.length, href: `/w/${slug}/projects`, icon: FolderKanban },
    { label: "In progress", value: inProgress.length, href: `/w/${slug}/my-work`, icon: CircleUserRound },
    { label: "Overdue", value: overdue.length, href: `/w/${slug}/my-work`, icon: AlertTriangle, danger: overdue.length > 0 },
    { label: "Members", value: profiles.length, href: `/w/${slug}/settings/members`, icon: Users },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6">
      <LiveRefresh
        channelKey={`pulse-${context.id}`}
        subscriptions={[
          { table: "work_items", filter: `workspace_id=eq.${context.id}` },
          { table: "activity_log", filter: `workspace_id=eq.${context.id}` },
        ]}
      />
      {showTour ? <WelcomeTour firstName={firstNameOf(user)} slug={slug} projectSlug={firstProject?.slug ?? null} /> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Pulse</h1>
          <p className="text-sm text-muted-foreground">
            Hi {firstNameOf(user)} — here&apos;s what&apos;s happening in <span className="font-medium text-foreground">{context.name}</span> right now.
          </p>
        </div>
        {profiles.length < 2 ? (
          <Button render={<Link href={`/w/${slug}/settings/members?invite=1`} />}>
            <Users />
            Invite your team
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {stat.label}
              <stat.icon className={cn("size-4", stat.danger && "text-red-500")} />
            </div>
            <p className={cn("mt-1 text-2xl font-semibold tabular-nums", stat.danger && "text-red-500")}>{stat.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Who&apos;s working on what</CardTitle>
            <CardDescription>Everything currently in progress, by person. No need to ask.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {byPerson.map(({ profile, theirs, openCount, lastActivity }) => (
              <div key={profile.id} className="flex items-start gap-3">
                <UserAvatar name={memberLabel(profile)} avatarUrl={profile.avatar_url} className="mt-0.5 size-8" fallbackClassName="text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium">{memberLabel(profile)}{profile.id === context.userId ? " (you)" : ""}</span>
                    <span className="text-xs text-muted-foreground">
                      {openCount} open{lastActivity ? ` · active ${timeAgo(lastActivity)}` : " · no activity yet"}
                    </span>
                  </div>
                  {theirs.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">Nothing in progress.</p>
                  ) : (
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {theirs.slice(0, 4).map((item) => {
                        const status = statusById.get(item.status_id)
                        const project = projectById.get(item.project_id)
                        return (
                          <li key={item.id}>
                            <Link href={`/w/${slug}/projects/${project?.slug ?? ""}?item=${item.key}`} className="flex items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-muted/60">
                              <StatusDot color={status?.color ?? "slate"} />
                              <span className="font-mono text-[11px] text-muted-foreground">{item.key}</span>
                              <span className="min-w-0 flex-1 truncate">{item.title}</span>
                              {isOverdue(item) ? <span className="text-[11px] text-red-500">overdue</span> : null}
                              <span className="hidden truncate text-xs text-muted-foreground sm:inline">{project?.name}</span>
                            </Link>
                          </li>
                        )
                      })}
                      {theirs.length > 4 ? <li className="px-1 text-xs text-muted-foreground">+{theirs.length - 4} more</li> : null}
                    </ul>
                  )}
                </div>
              </div>
            ))}
            {profiles.length < 2 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                It&apos;s just you so far.{" "}
                <Link href={`/w/${slug}/settings/members?invite=1`} className="font-medium text-brand hover:underline">Invite teammates</Link> to see their work here.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned to you</CardTitle>
              <CardDescription>{mine.length === 0 ? "You're all clear." : `${mine.length} open task${mine.length === 1 ? "" : "s"}.`}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {mine.slice(0, 6).map((item) => {
                const status = statusById.get(item.status_id)
                const project = projectById.get(item.project_id)
                return (
                  <Link key={item.id} href={`/w/${slug}/projects/${project?.slug ?? ""}?item=${item.key}`} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/60">
                    <PriorityIcon priority={item.priority} />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <StatusDot color={status?.color ?? "slate"} />
                    {item.due_date ? <span className={cn("text-[11px] text-muted-foreground", isOverdue(item) && "text-red-500")}>{formatShortDate(item.due_date)}</span> : null}
                  </Link>
                )
              })}
              {mine.length > 0 ? (
                <Link href={`/w/${slug}/my-work`} className="mt-1 flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                  Open My work <ArrowRight className="size-3" />
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
              <CardDescription>Health and progress at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {activeProjects.length === 0 ? <p className="text-sm text-muted-foreground">No active projects.</p> : null}
              {activeProjects.slice(0, 5).map((project) => {
                const health = PROJECT_HEALTH_META[project.health]
                return (
                  <Link key={project.id} href={`/w/${slug}/projects/${project.slug}`} className="flex flex-col gap-1 rounded-md px-1 py-1 hover:bg-muted/60">
                    <div className="flex items-center gap-2 text-sm">
                      <span aria-hidden className={cn("size-1.5 rounded-full", health.dot)} />
                      <span className="min-w-0 flex-1 truncate font-medium">{project.name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{project.progress}%</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${project.progress}%` }} />
                    </div>
                  </Link>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>What changed across the workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed rows={activity} profiles={profiles} slug={slug} projectSlugs={projectSlugs} emptyText="Activity will show up here as your team works." />
        </CardContent>
      </Card>
    </div>
  )
}
