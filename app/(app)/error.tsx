"use client"

import { AlertTriangle, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

// Catches failures thrown while rendering the workspace shell itself (for
// example a transient database error while loading the workspace), which the
// route-level error boundary under /w/[slug] cannot see.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {error.message || "We couldn't load this page."} {error.digest ? <span className="font-mono text-xs">({error.digest})</span> : null}
        </p>
      </div>
      <Button onClick={reset}>
        <RotateCcw />
        Try again
      </Button>
    </div>
  )
}
