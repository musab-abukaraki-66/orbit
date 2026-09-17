"use client"

import * as React from "react"
import { ListChecks, MessageSquareText, Sparkles, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const SUGGESTIONS = [
  { icon: ListChecks, title: "Summarize this project", text: "Get a two-line status of what moved, what's blocked and what's next." },
  { icon: Wand2, title: "Draft a task description", text: "Turn a one-line title into a clear, actionable description." },
  { icon: MessageSquareText, title: "Write a project update", text: "Generate a health update from recent activity for the lead to review." },
]

export function AiPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [prompt, setPrompt] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand" />
            Orbit AI
            <Badge variant="secondary" className="ml-1">Coming soon</Badge>
          </SheetTitle>
          <SheetDescription>
            Ask about your projects, draft tasks, and get status summaries. This preview shows what&apos;s coming — no requests are sent yet.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setPrompt(s.title)}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/60"
            >
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-background text-brand ring-1 ring-border">
                <s.icon className="size-4" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{s.title}</span>
                <span className="text-xs text-muted-foreground">{s.text}</span>
              </span>
            </button>
          ))}
          {submitted ? (
            <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm">
              <p className="font-medium">You&apos;re on the list.</p>
              <p className="mt-1 text-muted-foreground">AI features are in preview. We&apos;ll enable them for your workspace as soon as they&apos;re ready — nothing to configure.</p>
            </div>
          ) : null}
        </div>
        <form
          className="flex items-end gap-2 border-t p-4"
          onSubmit={(event) => {
            event.preventDefault()
            setSubmitted(true)
          }}
        >
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={2}
            placeholder="Ask Orbit AI… (preview)"
            className="min-h-10 flex-1 resize-none rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" className="bg-brand text-white hover:bg-brand/90">
            <Sparkles />
            Notify me
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
