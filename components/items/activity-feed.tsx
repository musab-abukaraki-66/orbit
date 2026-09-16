import Link from "next/link"

import type { ActivityRow, ProfileLite } from "@/lib/items/types"
import { memberLabel } from "@/lib/members/format"
import { timeAgo } from "@/components/items/meta"
import { UserAvatar } from "@/components/user-avatar"

export function describeActivity(row: ActivityRow): { text: string; detail?: string } {
  const d = row.data as Record<string, string | null | undefined>
  const key = d.key ? `${d.key}` : "a task"
  switch (row.action) {
    case "item_created":
      return { text: `created ${key}`, detail: d.assignee ? `assigned to ${d.assignee}` : undefined }
    case "status_changed":
      return { text: `moved ${key} to ${d.to ?? "a new status"}`, detail: d.from ? `from ${d.from}` : undefined }
    case "assignee_changed":
      return { text: d.to ? `assigned ${key} to ${d.to}` : `unassigned ${key}` }
    case "priority_changed":
      return { text: `set ${key} priority to ${d.to ?? "none"}` }
    case "title_changed":
      return { text: `renamed ${key}`, detail: d.to ?? undefined }
    case "due_date_changed":
      return { text: d.to ? `set ${key} due ${d.to}` : `cleared the due date on ${key}` }
    case "description_changed":
      return { text: `updated the description of ${key}` }
    case "project_changed":
      return { text: `moved ${key} to another project` }
    case "item_archived":
      return { text: `archived ${key}` }
    case "comment_added":
      return { text: `commented on ${key}`, detail: d.excerpt ?? undefined }
    case "project_created":
      return { text: `created project ${d.name ?? ""}`.trim() }
    case "project_status_changed":
      return { text: `set ${d.name ?? "the project"} to ${String(d.to ?? "").replace("_", " ")}` }
    case "project_update":
      return { text: `posted an update (${String(d.health ?? "").replace("_", " ")})`, detail: d.excerpt ?? undefined }
    default:
      return { text: row.action.replace(/_/g, " ") }
  }
}

export function ActivityFeed({
  rows,
  profiles,
  slug,
  projectSlugs,
  compact = false,
  emptyText = "Nothing has happened yet.",
}: {
  rows: ActivityRow[]
  profiles: ProfileLite[]
  slug: string
  projectSlugs?: Record<string, string>
  compact?: boolean
  emptyText?: string
}) {
  const byId = new Map(profiles.map((p) => [p.id, p]))
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>
  return (
    <ol className="flex flex-col gap-3">
      {rows.map((row) => {
        const actor = row.actor_id ? byId.get(row.actor_id) ?? null : null
        const name = actor ? memberLabel(actor) : "Someone"
        const { text, detail } = describeActivity(row)
        const key = (row.data as { key?: string }).key
        const projectSlug = row.project_id ? projectSlugs?.[row.project_id] : undefined
        const href = key && projectSlug ? `/w/${slug}/projects/${projectSlug}?item=${key}` : projectSlug ? `/w/${slug}/projects/${projectSlug}` : null
        return (
          <li key={row.id} className="flex items-start gap-2.5">
            <UserAvatar name={name} avatarUrl={actor?.avatar_url} className="mt-0.5 size-5" fallbackClassName="text-[9px]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">
                <span className="font-medium">{name}</span>{" "}
                {href ? (
                  <Link href={href} className="text-foreground/80 hover:underline">
                    {text}
                  </Link>
                ) : (
                  <span className="text-foreground/80">{text}</span>
                )}
                <span className="ml-1.5 text-xs text-muted-foreground">{timeAgo(row.created_at)}</span>
              </p>
              {detail && !compact ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{detail}</p> : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
