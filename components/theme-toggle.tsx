"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const hydrated = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  if (!hydrated) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Toggle theme"
        className="relative text-muted-foreground"
      >
        <Sun className="size-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle theme"
      className="relative"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
