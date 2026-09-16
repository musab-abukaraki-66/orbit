"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Command, Search, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CommandMenu, type CommandProject } from "@/components/command-menu"
import { AiPanel } from "@/components/ai/ai-panel"

export function SiteHeader({
  slug,
  unreadCount,
  projects,
  breadcrumbs,
}: {
  slug: string
  unreadCount: number
  projects: CommandProject[]
  breadcrumbs?: { label: string; href?: string }[]
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [aiOpen, setAiOpen] = React.useState(false)
  const base = `/w/${slug}`

  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-vertical:h-5" />
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm md:flex">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb.label}-${index}`}>
              {index > 0 ? <span className="text-muted-foreground/60">/</span> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="truncate text-muted-foreground hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      ) : null}

      <form
        role="search"
        className="relative ml-auto hidden max-w-xs flex-1 items-center sm:flex"
        onSubmit={(event) => {
          event.preventDefault()
          const q = query.trim()
          if (q) router.push(`${base}/search?q=${encodeURIComponent(q)}`)
        }}
      >
        <Search className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tasks, projects, people…"
          className="bg-muted/50 pl-8 pr-14"
          aria-label="Search"
        />
        <kbd className="pointer-events-none absolute right-2 hidden items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
          <Command className="size-2.5" />K
        </kbd>
      </form>

      <Button variant="ghost" size="icon-sm" aria-label="Search" className="sm:hidden ml-auto" onClick={() => setCommandOpen(true)}>
        <Search className="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Open command menu" className="hidden sm:inline-flex" onClick={() => setCommandOpen(true)}>
        <Command className="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="AI assistant" onClick={() => setAiOpen(true)}>
        <Sparkles className="size-4 text-brand" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative"
        render={<Link href={`${base}/inbox`} />}
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} slug={slug} projects={projects} />
      <AiPanel open={aiOpen} onOpenChange={setAiOpen} />
    </header>
  )
}
