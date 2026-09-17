"use client"

import * as React from "react"
import { useActionState } from "react"

import { postProjectUpdate, type FormState } from "@/lib/projects/actions"
import { PROJECT_HEALTH_META, type ProjectHealth } from "@/lib/projects/meta"
import { cn } from "@/lib/utils"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function ProjectUpdateForm({ projectId, slug, currentHealth }: { projectId: string; slug: string; currentHealth: ProjectHealth }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(postProjectUpdate.bind(null, projectId, slug), undefined)
  const [health, setHealth] = React.useState<ProjectHealth>(currentHealth)
  const formRef = React.useRef<HTMLFormElement>(null)

  React.useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Post an update</span>
        <div className="ml-auto flex gap-1" role="radiogroup" aria-label="Project health">
          {(Object.keys(PROJECT_HEALTH_META) as ProjectHealth[]).map((value) => {
            const meta = PROJECT_HEALTH_META[value]
            const active = value === health
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setHealth(value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  active ? "border-foreground/30 bg-muted" : "border-border text-muted-foreground hover:bg-muted/60",
                )}
              >
                <span aria-hidden className={cn("size-1.5 rounded-full", meta.dot)} />
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>
      <input type="hidden" name="health" value={health} />
      <Textarea name="body" rows={3} required placeholder="What moved this week? What's blocked? What's next?" />
      {state?.ok === false && state.message ? <Alert>{state.message}</Alert> : null}
      {state?.ok ? <Alert variant="success">{state.message}</Alert> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Posting…" : "Post update"}
        </Button>
      </div>
    </form>
  )
}
