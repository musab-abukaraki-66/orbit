import type { Metadata } from "next"
import Link from "next/link"
import { FolderKanban, Search, UserRound } from "lucide-react"

import { memberLabel } from "@/lib/members/data"
import { PROJECT_STATUS_META } from "@/lib/projects/data"
import { searchWorkspace } from "@/lib/search/data"
import { requireWorkspace } from "@/lib/workspaces/context"
import { EmptyState } from "@/components/empty-state"
import { UserAvatar } from "@/components/user-avatar"
import { Input } from "@/components/ui/input"
import type { Database } from "@/lib/supabase/database.types"

export const metadata: Metadata = { title: "Search" }

export default async function SearchPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> }) {
  const { slug } = await params
  const { q = "" } = await searchParams
  const context = await requireWorkspace(slug)
  const results = q.trim() ? await searchWorkspace(context.id, q) : null
  const total = results ? results.projects.length + results.items.length + results.members.length : 0

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">Find tasks, projects and people in {context.name}.</p>
      </div>
      <form className="relative max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder="Search by title, key, name or email…" className="h-10 pl-9" autoFocus aria-label="Search" />
      </form>

      {!results ? (
        <p className="text-sm text-muted-foreground">Type something and press Enter.</p>
      ) : total === 0 ? (
        <div className="rounded-xl border border-dashed border-border">
          <EmptyState icon={Search} title={`No results for “${q}”`} description="Try a different word, a task key like ACM-12, or a teammate's name." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Tasks ({results.items.length})</h2>
            {results.items.length === 0 ? <p className="text-sm text-muted-foreground">No tasks.</p> : null}
            {results.items.map((item) => (
              <Link key={item.id} href={item.project_slug ? `/w/${slug}/projects/${item.project_slug}?item=${item.key}` : `/w/${slug}/items/${item.key}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted/50">
                <span className="font-mono text-xs text-muted-foreground">{item.key}</span>
                <span className="truncate">{item.title}</span>
              </Link>
            ))}
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Projects ({results.projects.length})</h2>
            {results.projects.length === 0 ? <p className="text-sm text-muted-foreground">No projects.</p> : null}
            {results.projects.map((project) => (
              <Link key={project.id} href={`/w/${slug}/projects/${project.slug}`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted/50">
                <FolderKanban className="size-4 text-muted-foreground" />
                <span className="truncate">{project.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{PROJECT_STATUS_META[project.status as Database["public"]["Enums"]["project_status"]]?.label}</span>
              </Link>
            ))}
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">People ({results.members.length})</h2>
            {results.members.length === 0 ? <p className="text-sm text-muted-foreground">No people.</p> : null}
            {results.members.map((member) => (
              <Link key={member.id} href={`/w/${slug}/my-work`} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted/50">
                <UserAvatar name={memberLabel(member)} className="size-5" />
                <span className="truncate">{memberLabel(member)}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">{member.email}</span>
                <UserRound className="size-3.5 text-muted-foreground" />
              </Link>
            ))}
          </section>
        </div>
      )}
    </div>
  )
}
