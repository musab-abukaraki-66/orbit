"use client"

import * as React from "react"
import { Bell, Search } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  const [query, setQuery] = React.useState("")

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-horizontal:hidden data-vertical:h-5"
      />
      <div className="relative ml-auto flex max-w-xs flex-1 items-center">
        <Search className="absolute left-2.5 size-4 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tasks, boards…"
          className="bg-muted/50 pl-8"
          aria-label="Search"
        />
      </div>
      <Button variant="ghost" size="icon-sm" aria-label="Notifications">
        <Bell className="size-4" />
      </Button>
      <ThemeToggle />
    </header>
  )
}
