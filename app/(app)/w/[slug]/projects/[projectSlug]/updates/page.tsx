import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getItemsForProject, getProfilesForWorkspace, getStatusesForWorkspace } from "@/lib/items/data"
import { memberLabel } from "@/lib/members/data"
import { getProjectBySlug, getProjectUpdates, PROJECT_HEALTH_META } from "@/lib/projects/data"
import { requireWorkspace } from "@/lib/workspaces/context"
import { timeAgo } from "@/components/items/meta"
import { ProjectHeader } from "@/components/projects/project-header"
import { ProjectUpdateForm } from "@/components/projects/project-update-form"
import { LiveRefresh } from "@/components/realtime/use-live-refresh"
import { UserAvatar } from "@/components/user-avatar"
import { cn } from "@/lib/utils"

type Props = { params: Promise<{ slug: string; projectSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, projectSlug } = await params
  const context = await requireWorkspace(slug)
  const project = await getProjectBySlug(context.id, projectSlug)
  return { title: project ? `${project.name} · Updates` : "Project" }
}

export default async function ProjectUpdatesPage({ params }: Props) {
  const { slug, projectSlug } = await params
  const context = await requireWorkspace(slug)
  const project = await getProjectBySlug(context.id, projectSlug)
  if (!project) notFound()

  const [allStatuses, items, profiles, updates] = await Promise.all([
    getStatusesForWorkspace(context.id),
    getItemsForProject(project.id),
    getProfilesForWorkspace(context.id),
    getProjectUpdates(project.id),
  ])
  const statuses = allStatuses.filter((s) => s.team_id === project.team_id)
  const statusById = new Map(statuses.map((s) => [s.id, s]))
  const scoped = items.filter((i) => statusById.get(i.status_id)?.category !== "canceled")
  const completed = items.filter((i) => statusById.get(i.status_id)?.category === "completed").length

  return (
    <div className="flex flex-1 flex-col gap-4">
      <LiveRefresh channelKey={`updates-${project.id}`} subscriptions={[{ table: "projects", filter: `id=eq.${project.id}` }]} />
      <ProjectHeader slug={slug} project={project} active="updates" members={profiles} currentUserId={context.userId} isAdmin={context.isAdmin} progress={{ completed, total: scoped.length }} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <ProjectUpdateForm projectId={project.id} slug={slug} currentHealth={project.health} />
        {updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No updates yet. A short note each week keeps everyone aligned without a meeting.</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {updates.map((update) => {
              const meta = PROJECT_HEALTH_META[update.health]
              const author = update.author
              return (
                <li key={update.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={author ? memberLabel(author) : "?"} avatarUrl={author?.avatar_url} className="size-6" />
                    <span className="text-sm font-medium">{author ? memberLabel(author) : "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(update.created_at)}</span>
                    <span className={cn("ml-auto flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs font-medium", meta.className)}>
                      <span aria-hidden className={cn("size-1.5 rounded-full", meta.dot)} />
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{update.body}</p>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
