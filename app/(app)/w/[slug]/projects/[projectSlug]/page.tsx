import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getItemsForProject, getLabelsForWorkspace, getProfilesForWorkspace, getStatusesForWorkspace } from "@/lib/items/data"
import { getProjectBySlug } from "@/lib/projects/data"
import { createClient } from "@/lib/supabase/server"
import { requireWorkspace } from "@/lib/workspaces/context"
import { Board } from "@/components/items/board"
import { ItemSheetLoader } from "@/components/items/item-sheet-loader"
import { ProjectHeader } from "@/components/projects/project-header"

type Props = {
  params: Promise<{ slug: string; projectSlug: string }>
  searchParams: Promise<{ item?: string; new?: string; assignee?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, projectSlug } = await params
  const context = await requireWorkspace(slug)
  const project = await getProjectBySlug(context.id, projectSlug)
  return { title: project ? `${project.name} · Board` : "Project" }
}

export default async function ProjectBoardPage({ params, searchParams }: Props) {
  const { slug, projectSlug } = await params
  const { item: itemKey, new: openNew, assignee } = await searchParams
  const context = await requireWorkspace(slug)
  const project = await getProjectBySlug(context.id, projectSlug)
  if (!project) notFound()

  const supabase = await createClient()
  const [allStatuses, items, labels, profiles, commentRows] = await Promise.all([
    getStatusesForWorkspace(context.id),
    getItemsForProject(project.id),
    getLabelsForWorkspace(context.id),
    getProfilesForWorkspace(context.id),
    supabase.from("comments").select("work_item_id").eq("workspace_id", context.id),
  ])
  const statuses = allStatuses.filter((s) => s.team_id === project.team_id)
  const commentCounts: Record<string, number> = {}
  for (const row of commentRows.data ?? []) commentCounts[row.work_item_id] = (commentCounts[row.work_item_id] ?? 0) + 1
  const statusById = new Map(statuses.map((s) => [s.id, s]))
  const scoped = items.filter((i) => statusById.get(i.status_id)?.category !== "canceled")
  const completed = items.filter((i) => statusById.get(i.status_id)?.category === "completed").length

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <ProjectHeader
        slug={slug}
        project={project}
        active="board"
        members={profiles}
        currentUserId={context.userId}
        isAdmin={context.isAdmin}
        progress={{ completed, total: scoped.length }}
      />
      <Board
        slug={slug}
        workspaceId={context.id}
        projectId={project.id}
        projectSlug={project.slug}
        statuses={statuses}
        initialItems={items}
        labels={labels}
        profiles={profiles}
        commentCounts={commentCounts}
        openCreate={openNew === "1"}
        filterAssignee={assignee ?? null}
      />
      <ItemSheetLoader context={context} itemKey={itemKey} />
    </div>
  )
}
