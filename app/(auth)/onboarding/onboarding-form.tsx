"use client"

import * as React from "react"
import Link from "next/link"
import { useActionState } from "react"

import { createWorkspace, type FormState } from "@/lib/workspaces/actions"
import { deriveKey } from "@/lib/workspaces/key"
import { slugify } from "@/lib/slugify"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function OnboardingForm({ hasWorkspaces, backHref }: { hasWorkspaces: boolean; backHref: string | null }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createWorkspace, undefined)
  const [name, setName] = React.useState("")
  const [sample, setSample] = React.useState(true)
  const preview = name.trim() ? `${deriveKey(name)}-1 · orbit.app/w/${slugify(name).slice(0, 36)}` : null

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.ok === false && state.message ? <Alert>{state.message}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Workspace name
        </label>
        <Input id="name" name="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Digital" autoFocus required minLength={2} maxLength={80} />
        <p className="min-h-4 text-xs text-muted-foreground">{preview ? `Tasks will be numbered like ${preview}` : "You can invite teammates right after this."}</p>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} className="mt-0.5 accent-brand" />
        <input type="hidden" name="sample" value={sample ? "on" : "off"} />
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">Add a sample project</span>
          <span className="text-xs text-muted-foreground">A small “Getting started” board so you can see Orbit in action. Delete it any time.</span>
        </span>
      </label>

      <Button type="submit" size="lg" disabled={pending || name.trim().length < 2} className="w-full">
        {pending ? "Creating workspace…" : "Create workspace"}
      </Button>
      {hasWorkspaces && backHref ? (
        <p className="text-center text-sm text-muted-foreground">
          <Link href={backHref} className="font-medium text-foreground underline-offset-4 hover:underline">
            Back to your workspace
          </Link>
        </p>
      ) : null}
    </form>
  )
}
