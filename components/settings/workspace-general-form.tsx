"use client"

import { useActionState } from "react"

import { updateWorkspace, type FormState } from "@/lib/workspaces/actions"
import type { WorkspaceContext } from "@/lib/workspaces/context"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function WorkspaceGeneralForm({ workspace, canEdit }: { workspace: WorkspaceContext; canEdit: boolean }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateWorkspace.bind(null, workspace.id), undefined)
  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ws-name">Name</Label>
        <Input id="ws-name" name="name" defaultValue={workspace.name} disabled={!canEdit} required minLength={2} maxLength={80} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ws-slug">URL</Label>
          <Input id="ws-slug" value={`/w/${workspace.slug}`} readOnly className="text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ws-key">Task prefix</Label>
          <Input id="ws-key" value={workspace.key} readOnly className="font-mono text-muted-foreground" />
        </div>
      </div>
      {state?.ok === false && state.message ? <Alert>{state.message}</Alert> : null}
      {state?.ok ? <Alert variant="success">{state.message}</Alert> : null}
      {canEdit ? (
        <div>
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Only owners and admins can change workspace settings.</p>
      )}
    </form>
  )
}
