"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  ArrowRight,
  CircleUserRound,
  FolderKanban,
  Inbox,
  Plus,
  Search,
  Settings,
  UserRound,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export type CommandProject = { id: string; name: string; slug: string; status: string }

type Command = {
  id: string
  label: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  keywords?: string
  run: () => void
  group: "Actions" | "Navigate" | "Projects"
}

export function CommandMenu({
  open,
  onOpenChange,
  slug,
  projects,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  projects: CommandProject[]
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState(0)
  const base = `/w/${slug}`

  const go = React.useCallback(
    (href: string) => {
      onOpenChange(false)
      router.push(href)
    },
    [onOpenChange, router],
  )

  const commands = React.useMemo<Command[]>(() => {
    const active = projects.filter((p) => p.status !== "completed" && p.status !== "canceled")
    const firstProject = active[0] ?? projects[0]
    return [
      {
        id: "new-task",
        label: "Create task",
        hint: firstProject ? `in ${firstProject.name}` : "create a project first",
        icon: Plus,
        keywords: "new issue item card",
        group: "Actions",
        run: () => go(firstProject ? `${base}/projects/${firstProject.slug}?new=1` : `${base}/projects?new=1`),
      },
      { id: "new-project", label: "Create project", icon: FolderKanban, keywords: "new", group: "Actions", run: () => go(`${base}/projects?new=1`) },
      { id: "invite", label: "Invite a teammate", icon: Users, keywords: "member email", group: "Actions", run: () => go(`${base}/settings/members?invite=1`) },
      { id: "pulse", label: "Pulse", icon: Activity, keywords: "home dashboard overview", group: "Navigate", run: () => go(base) },
      { id: "my-work", label: "My work", icon: CircleUserRound, keywords: "assigned mine", group: "Navigate", run: () => go(`${base}/my-work`) },
      { id: "inbox", label: "Inbox", icon: Inbox, keywords: "notifications", group: "Navigate", run: () => go(`${base}/inbox`) },
      { id: "projects", label: "All projects", icon: FolderKanban, group: "Navigate", run: () => go(`${base}/projects`) },
      { id: "settings", label: "Settings", icon: Settings, keywords: "workspace members labels billing", group: "Navigate", run: () => go(`${base}/settings`) },
      { id: "profile", label: "Profile", icon: UserRound, group: "Navigate", run: () => go(`${base}/profile`) },
      ...projects.map<Command>((project) => ({
        id: `project-${project.id}`,
        label: project.name,
        hint: "Open board",
        icon: FolderKanban,
        group: "Projects",
        run: () => go(`${base}/projects/${project.slug}`),
      })),
    ]
  }, [base, go, projects])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? commands.filter((c) => `${c.label} ${c.hint ?? ""} ${c.keywords ?? ""}`.toLowerCase().includes(q))
    : commands
  const searchCommand: Command | null = q
    ? { id: "search", label: `Search for “${query.trim()}”`, icon: Search, group: "Actions", run: () => go(`${base}/search?q=${encodeURIComponent(query.trim())}`) }
    : null
  const list = searchCommand ? [...filtered, searchCommand] : filtered

  const [seenOpen, setSeenOpen] = React.useState(open)
  if (seenOpen !== open) {
    setSeenOpen(open)
    setSelected(0)
    if (!open) setQuery("")
  }

  const groups = ["Actions", "Navigate", "Projects"] as const

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[15%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setSelected(0)
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setSelected((s) => Math.min(s + 1, list.length - 1))
              } else if (event.key === "ArrowUp") {
                event.preventDefault()
                setSelected((s) => Math.max(s - 1, 0))
              } else if (event.key === "Enter") {
                event.preventDefault()
                list[selected]?.run()
              }
            }}
            placeholder="Type a command or search…"
            className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Command"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5" role="listbox">
          {list.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</p>
          ) : (
            groups.map((group) => {
              const items = list.filter((c) => c.group === group)
              if (items.length === 0) return null
              return (
                <div key={group} className="mb-1">
                  <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{group}</p>
                  {items.map((command) => {
                    const index = list.indexOf(command)
                    return (
                      <button
                        key={command.id}
                        type="button"
                        role="option"
                        aria-selected={index === selected}
                        onMouseEnter={() => setSelected(index)}
                        onClick={command.run}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm outline-none",
                          index === selected ? "bg-muted text-foreground" : "text-foreground/90",
                        )}
                      >
                        <command.icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{command.label}</span>
                        {command.hint ? <span className="truncate text-xs text-muted-foreground">{command.hint}</span> : null}
                        {index === selected ? <ArrowRight className="size-3.5 text-muted-foreground" /> : null}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
