import type { Metadata } from "next"
import { FolderKanban } from "lucide-react"

import { getProfilesForWorkspace } from "@/lib/items/data"
import { getProjects } from "@/lib/projects/data"
import { requireWorkspace } from "@/lib/workspaces/context"
import { ProjectCard } from "@/components/projects/project-card"
import { NewProjectButton } from "@/components/projects/new-project-button"
import { LiveRefresh } from "@/components/realtime/use-live-refresh"
import { EmptyState } from "@/components/empty-state"

export const metadata: Metadata = { title: "Projects" }

export default async function ProjectsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ new?: string; archived?: string }> }) {
  const { slug } = await params
  const { new: openNew, archived } = await searchParams
  const context = await requireWorkspace(slug)
  const [projects, profiles] = await Promise.all([getProjects(context.id, archived === "1"), getProfilesForWorkspace(context.id)])
  const visible = archived === "1" ? projects.filter((p) => p.archived_at) : projects
  const active = visible.filter((p) => p.status === "in_progress" || p.status === "planned" || p.status === "backlog")
  const finished = visible.filter((p) => p.status === "completed" || p.status === "canceled")

  return (
    <div className="flex flex-1 flex-col gap-6">
      <LiveRefresh channelKey={`projects-${context.id}`} subscriptions={[{ table: "work_items", filter: `workspace_id=eq.${context.id}` }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{archived === "1" ? "Archived projects" : "Projects"}</h1>
          <p className="text-sm text-muted-foreground">
            {visible.length === 0 ? "Projects hold the work for one outcome." : `${visible.length} project${visible.length === 1 ? "" : "s"} in ${context.name}.`}
          </p>
        </div>
        <NewProjectButton workspaceId={context.id} slug={slug} members={profiles} currentUserId={context.userId} autoOpen={openNew === "1"} />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border">
          <EmptyState icon={FolderKanban} title={archived === "1" ? "No archived projects" : "No projects yet"} description={archived === "1" ? "Archived projects will show up here." : "Create your first project to start organizing work — a launch, a redesign, a client."} />
        </div>
      ) : (
        <>
          {active.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">Active</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {active.map((project) => (
                  <ProjectCard key={project.id} project={project} slug={slug} />
                ))}
              </div>
            </section>
          ) : null}
          {finished.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">Completed &amp; canceled</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {finished.map((project) => (
                  <ProjectCard key={project.id} project={project} slug={slug} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
      <p className="text-xs text-muted-foreground">
        {archived === "1" ? (
          <a href={`/w/${slug}/projects`} className="hover:underline">← Back to active projects</a>
        ) : (
          <a href={`/w/${slug}/projects?archived=1`} className="hover:underline">View archived projects</a>
        )}
      </p>
    </div>
  )
}
