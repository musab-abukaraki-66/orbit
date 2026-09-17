import type { Metadata } from "next"
import { CircleUserRound } from "lucide-react"

import { getItemsForWorkspace, getLabelsForWorkspace, getProfilesForWorkspace, getStatusesForWorkspace } from "@/lib/items/data"
import { isOverdue, todayIso, type ItemPayload, type LabelRow, type ProfileLite, type StatusRow } from "@/lib/items/types"
import { getProjects } from "@/lib/projects/data"
import { requireWorkspace } from "@/lib/workspaces/context"
import { ItemList } from "@/components/items/item-list"
import { ItemSheetLoader } from "@/components/items/item-sheet-loader"
import { LiveRefresh } from "@/components/realtime/use-live-refresh"
import { EmptyState } from "@/components/empty-state"

export const metadata: Metadata = { title: "My work" }

type ProjectLite = { id: string; name: string; slug: string }

function Section({
  title,
  description,
  list,
  emptyText,
  slug,
  statuses,
  labels,
  profiles,
  projects,
}: {
  title: string
  description: string
  list: ItemPayload[]
  emptyText: string
  slug: string
  statuses: StatusRow[]
  labels: LabelRow[]
  profiles: ProfileLite[]
  projects: ProjectLite[]
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">
          {title} <span className="text-sm font-normal text-muted-foreground">({list.length})</span>
        </h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ItemList slug={slug} items={list} statuses={statuses} labels={labels} profiles={profiles} projects={projects} showProject itemHrefPrefix={`/w/${slug}/my-work?item=`} />
      )}
    </section>
  )
}

export default async function MyWorkPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ item?: string }> }) {
  const { slug } = await params
  const { item: itemKey } = await searchParams
  const context = await requireWorkspace(slug)
  const [items, statuses, labels, profiles, projects] = await Promise.all([
    getItemsForWorkspace(context.id),
    getStatusesForWorkspace(context.id),
    getLabelsForWorkspace(context.id),
    getProfilesForWorkspace(context.id),
    getProjects(context.id),
  ])
  const today = todayIso()
  const week = todayIso(7)
  const statusById = new Map(statuses.map((s) => [s.id, s]))
  const mine = items.filter((i) => i.assignee_id === context.userId)
  const category = (i: ItemPayload) => statusById.get(i.status_id)?.category
  const open = mine.filter((i) => category(i) !== "completed" && category(i) !== "canceled")
  const overdue = open.filter((i) => isOverdue(i, today))
  const upcoming = open.filter((i) => i.due_date && i.due_date >= today && i.due_date <= week)
  const done = mine
    .filter((i) => category(i) === "completed")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
    .slice(0, 10)
  const projectList: ProjectLite[] = projects.map((p) => ({ id: p.id, name: p.name, slug: p.slug }))
  const shared = { slug, statuses, labels, profiles, projects: projectList }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <LiveRefresh channelKey={`mywork-${context.userId}`} subscriptions={[{ table: "work_items", filter: `workspace_id=eq.${context.id}` }]} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">My work</h1>
        <p className="text-sm text-muted-foreground">
          Everything assigned to you across {projects.length} project{projects.length === 1 ? "" : "s"}.
        </p>
      </div>
      {mine.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border">
          <EmptyState icon={CircleUserRound} title="Nothing assigned to you yet" description="When a teammate assigns you a task — or you assign one to yourself — it shows up here with due dates and status." />
        </div>
      ) : (
        <>
          {overdue.length > 0 ? <Section title="Overdue" description="Past their due date and still open." list={overdue} emptyText="" {...shared} /> : null}
          <Section title="Open" description="Assigned to you and not done." list={open} emptyText="You're all caught up." {...shared} />
          <Section title="Due this week" description="Open tasks due in the next 7 days." list={upcoming} emptyText="Nothing due this week." {...shared} />
          <Section title="Recently completed" description="Your last finished tasks." list={done} emptyText="Nothing completed yet." {...shared} />
        </>
      )}
      <ItemSheetLoader context={context} itemKey={itemKey} />
    </div>
  )
}
