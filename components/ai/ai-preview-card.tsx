"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function AiPreviewCard() {
  const [prompt, setPrompt] = React.useState("")
  const [messages, setMessages] = React.useState<{ role: "user" | "ai"; text: string }[]>([])

  return (
    <div className="flex flex-col gap-3">
      {messages.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {messages.map((m, i) => (
            <li key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-xl bg-brand px-3 py-2 text-sm text-white" : "max-w-[85%] rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm"}>
              {m.text}
            </li>
          ))}
        </ol>
      ) : null}
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const text = prompt.trim()
          if (!text) return
          setMessages((prev) => [
            ...prev,
            { role: "user", text },
            { role: "ai", text: "Orbit AI is in preview. When it launches, this answer will be grounded in your workspace's projects, tasks and activity — no setup required." },
          ])
          setPrompt("")
        }}
      >
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} placeholder="e.g. Summarize what changed in Website Redesign this week" className="flex-1 resize-none" />
        <Button type="submit" className="bg-brand text-white hover:bg-brand/90" disabled={!prompt.trim()}>
          <Sparkles />
          Ask
        </Button>
      </form>
    </div>
  )
}
