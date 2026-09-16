import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Users } from "lucide-react"

import { getActivityForItem, getItemsForProject, getProfilesForWorkspace, getStatusesForWorkspace } from "@/lib/items/data"
import { memberLabel } from "@/lib/members/data"
import { getProjectBySlug, getProjectMembers, getProjectUpdates, PROJECT_HEALTH_META } from "@/lib/projects/data"
import { createClient } from "@/lib/supabase/server"
import { requireWorkspace } from "@/lib/workspaces/context"
import { ActivityFeed } from "@/components/items/activity-feed"
import { StatusDot, timeAgo } from "@/components/items/meta"
import { ProjectHeader } from "@/components/projects/project-header"
import { ProjectMembersEditor } from "@/components/projects/project-members-editor"
import { UserAvatar } from "@/components/user-avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ActivityRow } from "@/lib/items/types"

type Props = { params: Promise<{ slug: string; projectSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, projectSlug } = await params
  const context = await requireWorkspace(slug)
  const project = await getProjectBySlug(context.id, projectSlug)
  return { title: project ? `${project.name} · Overview` : "Project" }
}

export default async function ProjectOverviewPage({ params }: Props) {
  const { slug, projectSlug } = await params
  const context = await requireWorkspace(slug)
  const project = await getProjectBySlug(context.id, projectSlug)
  if (!project) notFound()

  const supabase = await createClient()
  const [allStatuses, items, profiles, updates, members, activityRows] = await Promise.all([
    getStatusesForWorkspace(context.id),
    getItemsForProject(project.id),
    getProfilesForWorkspace(context.id),
    getProjectUpdates(project.id),
    getProjectMembers(project.id),
    supabase
      .from("activity_log")
      .select("id, actor_id, project_id, work_item_id, comment_id, action, data, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(15),
  ])
  void getActivityForItem
  const statuses = allStatuses.filter((s) => s.team_id === project.team_id)
  const statusById = new Map(statuses.map((s) => [s.id, s]))
  const scoped = items.filter((i) => statusById.get(i.status_id)?.category !== "canceled")
  const completed = items.filter((i) => statusById.get(i.status_id)?.category === "completed").length
  const latest = updates[0] ?? null
  const health = PROJECT_HEALTH_META[project.health]

  const perAssignee = new Map<string, number>()
  for (const item of scoped) {
    if (statusById.get(item.status_id)?.category === "completed") continue
    const key = item.assignee_id ?? "unassigned"
    perAssignee.set(key, (perAssignee.get(key) ?? 0) + 1)
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ProjectHeader slug={slug} project={project} active="overview" members={profiles} currentUserId={context.userId} isAdmin={context.isAdmin} progress={{ completed, total: scoped.length }} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>About this project</CardTitle>
            <CardDescription>{project.description ? "" : "No description yet — edit the project to add one."}</CardDescription>
          </CardHeader>
          <CardContent>
            {project.description ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{project.description}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statuses.map((status) => {
                const count = items.filter((i) => i.status_id === status.id).length
                return (
                  <div key={status.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <StatusDot color={status.color} />
                      {status.name}
                    </div>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{count}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span aria-hidden className={`size-2 rounded-full ${health.dot}`} />
              {health.label}
            </CardTitle>
            <CardDescription>{latest ? `Last update ${timeAgo(latest.created_at)}` : "No updates posted yet."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {latest ? (
              <p className="line-clamp-5 text-sm leading-relaxed">{latest.body}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Leads post short weekly updates so nobody has to ask how it&apos;s going.</p>
            )}
            <Link href={`/w/${slug}/projects/${project.slug}/updates`} className="text-sm font-medium text-brand hover:underline">
              {latest ? "See all updates" : "Post the first update"} →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open work by person</CardTitle>
            <CardDescription>Who has what on their plate.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {perAssignee.size === 0 ? <p className="text-sm text-muted-foreground">Nothing open right now.</p> : null}
            {[...perAssignee.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([id, count]) => {
                const profile = profiles.find((p) => p.id === id) ?? null
                return (
                  <div key={id} className="flex items-center gap-2 text-sm">
                    <UserAvatar name={profile ? memberLabel(profile) : "?"} avatarUrl={profile?.avatar_url} className="size-6" />
                    <span className="flex-1 truncate">{profile ? memberLabel(profile) : "Unassigned"}</span>
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </div>
                )
              })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              Project members
            </CardTitle>
            <CardDescription>Members are notified about project updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectMembersEditor
              slug={slug}
              projectId={project.id}
              members={members}
              allProfiles={profiles}
              canEdit={context.isAdmin || project.lead_id === context.userId}
              currentUserId={context.userId}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>What changed in this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed rows={(activityRows.data ?? []) as ActivityRow[]} profiles={profiles} slug={slug} projectSlugs={{ [project.id]: project.slug }} compact />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
