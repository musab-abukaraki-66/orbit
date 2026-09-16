"use client"

import * as React from "react"

import { createItem } from "@/lib/items/actions"
import type { ItemPayload, LabelRow, Priority, ProfileLite, StatusRow } from "@/lib/items/types"
import { AssigneePicker, LabelPicker, PriorityPicker, StatusPicker } from "@/components/items/pickers"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ItemCreateDialog({
  open,
  onOpenChange,
  slug,
  workspaceId,
  projectId,
  statuses,
  defaultStatusId,
  labels,
  profiles,
  onLabelCreated,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  workspaceId: string
  projectId: string
  statuses: StatusRow[]
  defaultStatusId: string | null
  labels: LabelRow[]
  profiles: ProfileLite[]
  onLabelCreated?: (label: LabelRow) => void
  onCreated?: (item: ItemPayload) => void
}) {
  const fallbackStatus = statuses.find((s) => s.is_default)?.id ?? statuses[0]?.id ?? ""
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [statusId, setStatusId] = React.useState(defaultStatusId ?? fallbackStatus)
  const [priority, setPriority] = React.useState<Priority>("none")
  const [assigneeId, setAssigneeId] = React.useState<string | null>(null)
  const [dueDate, setDueDate] = React.useState("")
  const [labelIds, setLabelIds] = React.useState<string[]>([])
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [createMore, setCreateMore] = React.useState(false)

  const [seenOpen, setSeenOpen] = React.useState(open)
  if (seenOpen !== open) {
    setSeenOpen(open)
    if (open) {
      setStatusId(defaultStatusId ?? fallbackStatus)
      setError(null)
    }
  }

  function reset() {
    setTitle("")
    setDescription("")
    setPriority("none")
    setAssigneeId(null)
    setDueDate("")
    setLabelIds([])
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError("Give the task a title.")
      return
    }
    setPending(true)
    setError(null)
    const result = await createItem(projectId, slug, {
      title,
      description,
      status_id: statusId,
      priority,
      assignee_id: assigneeId,
      due_date: dueDate || null,
      label_ids: labelIds,
    })
    setPending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    onCreated?.(result.item)
    reset()
    if (!createMore) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Keep the title short and actionable. You can add details later.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-item-title">Title</Label>
            <Input id="new-item-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ship the onboarding flow" autoFocus required maxLength={300} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-item-description">Description</Label>
            <Textarea id="new-item-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Add context for your team…" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPicker statuses={statuses} value={statusId} onChange={setStatusId} />
            <PriorityPicker value={priority} onChange={setPriority} />
            <AssigneePicker profiles={profiles} value={assigneeId} onChange={setAssigneeId} />
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-7 w-auto text-xs" aria-label="Due date" />
          </div>
          <LabelPicker labels={labels} value={labelIds} onChange={setLabelIds} workspaceId={workspaceId} slug={slug} onLabelCreated={onLabelCreated} />
          {error ? <Alert>{error}</Alert> : null}
          <DialogFooter className="sm:justify-between">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={createMore} onChange={(e) => setCreateMore(e.target.checked)} className="accent-brand" />
              Create more
            </label>
            <div className="flex gap-2">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create task"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
