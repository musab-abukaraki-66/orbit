"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"

import { createLabel, deleteLabel, updateLabel } from "@/lib/items/actions"
import { COLOR_NAMES, swatchClass, type LabelRow } from "@/lib/items/types"
import { cn } from "@/lib/utils"
import { LabelChip } from "@/components/items/meta"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function LabelsEditor({ slug, workspaceId, labels, usage, canEdit }: { slug: string; workspaceId: string; labels: LabelRow[]; usage: Record<string, number>; canEdit: boolean }) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [color, setColor] = React.useState("violet")
  const [pending, setPending] = React.useState(false)

  async function run(promise: Promise<{ ok: boolean; message?: string }>) {
    setError(null)
    const result = await promise
    if (!result.ok) setError(result.message ?? "Something went wrong.")
    else router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert>{error}</Alert> : null}
      {labels.length === 0 ? <p className="text-sm text-muted-foreground">No labels yet.</p> : null}
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {labels.map((label) => (
          <LabelRowEditor key={`${label.id}:${label.name}`} label={label} count={usage[label.id] ?? 0} canEdit={canEdit} onSave={(n, c) => void run(updateLabel(label.id, slug, n, c))} onDelete={() => void run(deleteLabel(label.id, slug))} />
        ))}
      </ul>
      <form
        className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setPending(true)
          const result = await createLabel(workspaceId, slug, name, color)
          setPending(false)
          if (!result.ok) setError(result.message)
          else {
            setName("")
            router.refresh()
          }
        }}
      >
        <p className="text-sm font-medium">New label</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bug, Marketing, Q4" className="h-8 w-56" required maxLength={40} />
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Color">
            {COLOR_NAMES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={c === color} aria-label={c} onClick={() => setColor(c)} className={cn("size-5 rounded-full ring-offset-2 ring-offset-background", swatchClass(c), c === color && "ring-2 ring-foreground")} />
            ))}
          </div>
          <Button type="submit" size="sm" disabled={pending || !name.trim()}>
            <Plus className="size-3.5" />
            Add label
          </Button>
        </div>
      </form>
    </div>
  )
}

function LabelRowEditor({ label, count, canEdit, onSave, onDelete }: { label: LabelRow; count: number; canEdit: boolean; onSave: (name: string, color: string) => void; onDelete: () => void }) {
  const [name, setName] = React.useState(label.name)
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2">
      <LabelChip name={label.name} color={label.color} />
      {canEdit ? (
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { if (name.trim() && name.trim() !== label.name) onSave(name, label.color); else setName(label.name) }} className="h-7 w-44 text-sm" aria-label="Label name" />
      ) : null}
      <span className="text-xs text-muted-foreground">{count} task{count === 1 ? "" : "s"}</span>
      {canEdit ? (
        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-0.5">
            {COLOR_NAMES.map((c) => (
              <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => onSave(label.name, c)} className={cn("size-3.5 rounded-full", swatchClass(c), c === label.color && "ring-2 ring-foreground ring-offset-1 ring-offset-background")} />
            ))}
          </div>
          <Button variant="ghost" size="icon-xs" aria-label={`Delete ${label.name}`} onClick={onDelete}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      ) : null}
    </li>
  )
}
