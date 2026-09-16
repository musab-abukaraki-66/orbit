"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Check, Plus, Star, Trash2 } from "lucide-react"

import { createStatus, deleteStatus, updateStatus } from "@/lib/statuses/actions"
import { CATEGORY_LABEL, COLOR_NAMES, swatchClass, type StatusCategory, type StatusRow } from "@/lib/items/types"
import { cn } from "@/lib/utils"
import { StatusDot } from "@/components/items/meta"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const CATEGORIES = Object.keys(CATEGORY_LABEL) as StatusCategory[]

export function StatusesEditor({ slug, teamId, statuses, usage, canEdit }: { slug: string; teamId: string; statuses: StatusRow[]; usage: Record<string, number>; canEdit: boolean }) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState<StatusCategory>("started")
  const [color, setColor] = React.useState("violet")
  const [pending, setPending] = React.useState(false)
  const sorted = [...statuses].sort((a, b) => a.position - b.position)

  async function run(promise: Promise<{ ok: boolean; message?: string }>) {
    setError(null)
    const result = await promise
    if (!result.ok) setError(result.message ?? "Something went wrong.")
    else router.refresh()
  }

  async function move(index: number, direction: -1 | 1) {
    const other = sorted[index + direction]
    const current = sorted[index]
    if (!other) return
    await run(updateStatus(current.id, slug, { position: other.position }))
    await run(updateStatus(other.id, slug, { position: current.position }))
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert>{error}</Alert> : null}
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {sorted.map((status, index) => (
          <StatusRowEditor
            key={`${status.id}:${status.name}`}
            status={status}
            count={usage[status.id] ?? 0}
            canEdit={canEdit}
            isFirst={index === 0}
            isLast={index === sorted.length - 1}
            onMoveUp={() => void move(index, -1)}
            onMoveDown={() => void move(index, 1)}
            onSave={(patch) => void run(updateStatus(status.id, slug, patch))}
            onDelete={() => void run(deleteStatus(status.id, slug))}
          />
        ))}
      </ul>

      {canEdit ? (
        <form
          className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setPending(true)
            await run(createStatus(teamId, slug, name, category, color))
            setPending(false)
            setName("")
          }}
        >
          <p className="text-sm font-medium">Add a status</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Blocked, QA, Shipped" className="h-8 w-56" required maxLength={40} />
            <select value={category} onChange={(e) => setCategory(e.target.value as StatusCategory)} className="h-8 rounded-lg border border-input bg-background px-2 text-sm dark:bg-input/30" aria-label="Category">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>
            <div className="flex gap-1" role="radiogroup" aria-label="Color">
              {COLOR_NAMES.slice(0, 10).map((c) => (
                <button key={c} type="button" role="radio" aria-checked={c === color} aria-label={c} onClick={() => setColor(c)} className={cn("size-5 rounded-full ring-offset-2 ring-offset-background", swatchClass(c), c === color && "ring-2 ring-foreground")} />
              ))}
            </div>
            <Button type="submit" size="sm" disabled={pending || !name.trim()}>
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">Only owners and admins can change statuses.</p>
      )}
    </div>
  )
}

function StatusRowEditor({
  status,
  count,
  canEdit,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onSave,
  onDelete,
}: {
  status: StatusRow
  count: number
  canEdit: boolean
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onSave: (patch: { name?: string; color?: string; category?: StatusCategory; is_default?: boolean }) => void
  onDelete: () => void
}) {
  const [name, setName] = React.useState(status.name)
  return (
    <li className="flex flex-wrap items-center gap-2 px-3 py-2">
      <StatusDot color={status.color} className="size-2.5" />
      {canEdit ? (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name.trim() !== status.name) onSave({ name })
            else setName(status.name)
          }}
          className="h-7 w-40 text-sm"
          aria-label="Status name"
        />
      ) : (
        <span className="w-40 text-sm font-medium">{status.name}</span>
      )}
      {canEdit ? (
        <select value={status.category} onChange={(e) => onSave({ category: e.target.value as StatusCategory })} className="h-7 rounded-md border border-input bg-background px-1.5 text-xs dark:bg-input/30" aria-label="Category">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </select>
      ) : (
        <span className="text-xs text-muted-foreground">{CATEGORY_LABEL[status.category]}</span>
      )}
      <span className="text-xs text-muted-foreground">{count} task{count === 1 ? "" : "s"}</span>
      {status.is_default ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Star className="size-3" /> Default for new tasks
        </span>
      ) : canEdit ? (
        <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => onSave({ is_default: true })}>
          <Check className="size-3" /> Make default
        </Button>
      ) : null}
      {canEdit ? (
        <div className="ml-auto flex items-center gap-1">
          <div className="flex gap-0.5">
            {COLOR_NAMES.slice(0, 10).map((c) => (
              <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => onSave({ color: c })} className={cn("size-3.5 rounded-full", swatchClass(c), c === status.color && "ring-2 ring-foreground ring-offset-1 ring-offset-background")} />
            ))}
          </div>
          <Button variant="ghost" size="icon-xs" aria-label="Move up" disabled={isFirst} onClick={onMoveUp}><ArrowUp className="size-3" /></Button>
          <Button variant="ghost" size="icon-xs" aria-label="Move down" disabled={isLast} onClick={onMoveDown}><ArrowDown className="size-3" /></Button>
          <Button variant="ghost" size="icon-xs" aria-label="Delete status" disabled={count > 0 || status.is_default} onClick={onDelete}><Trash2 className="size-3" /></Button>
        </div>
      ) : null}
    </li>
  )
}
