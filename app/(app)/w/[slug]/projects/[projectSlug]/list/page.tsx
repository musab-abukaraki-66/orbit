import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getItemsForProject, getLabelsForWorkspace, getProfilesForWorkspace, getStatusesForWorkspace } from "@/lib/items/data"
import { getProjectBySlug } from "@/lib/projects/data"
import { requireWorkspace } from "@/lib/workspaces/context"
import { ItemList } from "@/components/items/item-list"
import { ItemSheetLoader } from "@/components/items/item-sheet-loader"
import { LiveRefresh } from "@/components/realtime/use-live-refresh"
import { ProjectHeader } from "@/components/projects/project-header"

type Props = { params: Promise<{ slug: string; projectSlug: string }>; searchParams: Promise<{ item?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, projectSlug } = await params
  const context = await requireWorkspace(slug)
  const project = await getProjectBySlug(context.id, projectSlug)
  return { title: project ? `${project.name} · List` : "Project" }
}

export default async function ProjectListPage({ params, searchParams }: Props) {
  const { slug, projectSlug } = await params
  const { item: itemKey } = await searchParams
  const context = await requireWorkspace(slug)
  const project = await getProjectBySlug(context.id, projectSlug)
  if (!project) notFound()

  const [allStatuses, items, labels, profiles] = await Promise.all([
    getStatusesForWorkspace(context.id),
    getItemsForProject(project.id),
    getLabelsForWorkspace(context.id),
    getProfilesForWorkspace(context.id),
  ])
  const statuses = allStatuses.filter((s) => s.team_id === project.team_id)
  const statusById = new Map(statuses.map((s) => [s.id, s]))
  const scoped = items.filter((i) => statusById.get(i.status_id)?.category !== "canceled")
  const completed = items.filter((i) => statusById.get(i.status_id)?.category === "completed").length

  return (
    <div className="flex flex-1 flex-col gap-4">
      <LiveRefresh channelKey={`list-${project.id}`} subscriptions={[{ table: "work_items", filter: `project_id=eq.${project.id}` }]} />
      <ProjectHeader slug={slug} project={project} active="list" members={profiles} currentUserId={context.userId} isAdmin={context.isAdmin} progress={{ completed, total: scoped.length }} />
      <ItemList
        slug={slug}
        items={items}
        statuses={statuses}
        labels={labels}
        profiles={profiles}
        itemHrefPrefix={`/w/${slug}/projects/${project.slug}/list?item=`}
        emptyText="No tasks yet. Switch to the board to add the first one."
      />
      <ItemSheetLoader context={context} itemKey={itemKey} />
    </div>
  )
}
