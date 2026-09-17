"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpDown, ListFilter, X } from "lucide-react"

import { isOverdue, PRIORITY_META, type ItemPayload, type LabelRow, type ProfileLite, type StatusRow } from "@/lib/items/types"
import { memberLabel } from "@/lib/members/format"
import { cn } from "@/lib/utils"
import { formatShortDate, LabelChip, PriorityIcon, StatusDot } from "@/components/items/meta"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

type SortKey = "updated" | "priority" | "due" | "status" | "title" | "key"

export function ItemList({
  slug,
  items,
  statuses,
  labels,
  profiles,
  projects,
  showProject = false,
  itemHrefPrefix,
  emptyText = "No tasks match.",
}: {
  slug: string
  items: ItemPayload[]
  statuses: StatusRow[]
  labels: LabelRow[]
  profiles: ProfileLite[]
  projects?: { id: string; name: string; slug: string }[]
  showProject?: boolean
  itemHrefPrefix: string
  emptyText?: string
}) {
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null)
  const [assigneeFilter, setAssigneeFilter] = React.useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = React.useState<string | null>(null)
  const [labelFilter, setLabelFilter] = React.useState<string | null>(null)
  const [sort, setSort] = React.useState<SortKey>("updated")
  const [dir, setDir] = React.useState<1 | -1>(-1)

  const statusById = React.useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses])
  const labelById = React.useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels])
  const profileById = React.useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])
  const projectById = React.useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = items.filter((item) => {
      if (q && !`${item.key} ${item.title}`.toLowerCase().includes(q)) return false
      if (statusFilter && item.status_id !== statusFilter) return false
      if (assigneeFilter && (assigneeFilter === "unassigned" ? item.assignee_id : item.assignee_id !== assigneeFilter)) return false
      if (priorityFilter && item.priority !== priorityFilter) return false
      if (labelFilter && !item.label_ids.includes(labelFilter)) return false
      return true
    })
    const statusPos = (id: string) => statusById.get(id)?.position ?? 0
    list.sort((a, b) => {
      let v = 0
      switch (sort) {
        case "priority": v = PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank; break
        case "due": v = (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"); break
        case "status": v = statusPos(a.status_id) - statusPos(b.status_id) || a.position - b.position; break
        case "title": v = a.title.localeCompare(b.title); break
        case "key": v = a.number - b.number; break
        default: v = a.updated_at.localeCompare(b.updated_at)
      }
      return v * dir
    })
    return list
  }, [items, query, statusFilter, assigneeFilter, priorityFilter, labelFilter, sort, dir, statusById])

  const activeFilters = [statusFilter, assigneeFilter, priorityFilter, labelFilter].filter(Boolean).length
  const toggleSort = (key: SortKey) => {
    if (sort === key) setDir((d) => (d === 1 ? -1 : 1))
    else {
      setSort(key)
      setDir(key === "updated" ? -1 : 1)
    }
  }

  const header = (label: string, key: SortKey, className?: string) => (
    <th className={cn("px-3 py-2 text-left text-xs font-medium text-muted-foreground", className)}>
      <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        <ArrowUpDown className={cn("size-3", sort === key ? "opacity-100" : "opacity-30")} />
      </button>
    </th>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by title or key…" className="h-8 w-56" aria-label="Filter tasks" />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <ListFilter className="size-3.5" />
            Filters{activeFilters ? ` (${activeFilters})` : ""}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 min-w-52 overflow-y-auto">
            <DropdownMenuGroup>
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {statuses.map((s) => (
              <DropdownMenuItem key={s.id} closeOnClick={false} onClick={() => setStatusFilter(statusFilter === s.id ? null : s.id)} className={cn(statusFilter === s.id && "bg-muted")}>
                <StatusDot color={s.color} />
                {s.name}
              </DropdownMenuItem>
            ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
            <DropdownMenuLabel>Assignee</DropdownMenuLabel>
            <DropdownMenuItem closeOnClick={false} onClick={() => setAssigneeFilter(assigneeFilter === "unassigned" ? null : "unassigned")} className={cn(assigneeFilter === "unassigned" && "bg-muted")}>
              Unassigned
            </DropdownMenuItem>
            {profiles.map((p) => (
              <DropdownMenuItem key={p.id} closeOnClick={false} onClick={() => setAssigneeFilter(assigneeFilter === p.id ? null : p.id)} className={cn(assigneeFilter === p.id && "bg-muted")}>
                {memberLabel(p)}
              </DropdownMenuItem>
            ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
            <DropdownMenuLabel>Priority</DropdownMenuLabel>
            {(Object.keys(PRIORITY_META) as (keyof typeof PRIORITY_META)[]).map((p) => (
              <DropdownMenuItem key={p} closeOnClick={false} onClick={() => setPriorityFilter(priorityFilter === p ? null : p)} className={cn(priorityFilter === p && "bg-muted")}>
                <PriorityIcon priority={p} />
                {PRIORITY_META[p].label}
              </DropdownMenuItem>
            ))}
            </DropdownMenuGroup>
            {labels.length ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                <DropdownMenuLabel>Label</DropdownMenuLabel>
                {labels.map((l) => (
                  <DropdownMenuItem key={l.id} closeOnClick={false} onClick={() => setLabelFilter(labelFilter === l.id ? null : l.id)} className={cn(labelFilter === l.id && "bg-muted")}>
                    <LabelChip name={l.name} color={l.color} />
                  </DropdownMenuItem>
                ))}
                </DropdownMenuGroup>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        {activeFilters ? (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(null); setAssigneeFilter(null); setPriorityFilter(null); setLabelFilter(null) }}>
            <X className="size-3.5" />
            Clear
          </Button>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {items.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40">
              <tr>
                {header("Key", "key", "w-24")}
                {header("Task", "title")}
                {header("Status", "status", "w-36")}
                {header("Priority", "priority", "w-28")}
                <th className="w-40 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Assignee</th>
                {showProject ? <th className="w-40 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Project</th> : null}
                {header("Due", "due", "w-24")}
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Labels</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const status = statusById.get(item.status_id)
                const assignee = item.assignee_id ? profileById.get(item.assignee_id) ?? null : null
                const project = projectById.get(item.project_id)
                const overdue = isOverdue(item)
                return (
                  <tr key={item.id} className="border-t border-border transition-colors hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      <Link href={`${itemHrefPrefix}${item.key}`} className="hover:text-foreground">{item.key}</Link>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`${itemHrefPrefix}${item.key}`} className="line-clamp-1 font-medium hover:underline">{item.title}</Link>
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5 text-xs">
                        <StatusDot color={status?.color ?? "slate"} />
                        {status?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5 text-xs">
                        <PriorityIcon priority={item.priority} />
                        {PRIORITY_META[item.priority].label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {assignee ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <UserAvatar name={memberLabel(assignee)} avatarUrl={assignee.avatar_url} className="size-5" fallbackClassName="text-[9px]" />
                          <span className="truncate">{memberLabel(assignee)}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    {showProject ? (
                      <td className="px-3 py-2 text-xs">
                        {project ? <Link href={`/w/${slug}/projects/${project.slug}`} className="hover:underline">{project.name}</Link> : "—"}
                      </td>
                    ) : null}
                    <td className={cn("px-3 py-2 text-xs", overdue && "text-red-500")}>{formatShortDate(item.due_date) ?? "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {item.label_ids.map((id) => {
                          const label = labelById.get(id)
                          return label ? <LabelChip key={id} name={label.name} color={label.color} /> : null
                        })}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
