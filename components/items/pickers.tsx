"use client"

import * as React from "react"
import { Check, CircleUserRound, Plus, Tag, X } from "lucide-react"

import { createLabel } from "@/lib/items/actions"
import { COLOR_NAMES, PRIORITY_META, PRIORITY_ORDER, swatchClass, type LabelRow, type Priority, type ProfileLite, type StatusRow } from "@/lib/items/types"
import { memberLabel } from "@/lib/members/format"
import { cn } from "@/lib/utils"
import { LabelChip, PriorityIcon, StatusDot } from "@/components/items/meta"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

const triggerClass = "h-7 justify-start gap-1.5 px-2 text-xs font-normal"

export function StatusPicker({ statuses, value, onChange, size = "sm" }: { statuses: StatusRow[]; value: string; onChange: (id: string) => void; size?: "sm" | "xs" }) {
  const current = statuses.find((s) => s.id === value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size={size} className={triggerClass} />}>
        <StatusDot color={current?.color ?? "slate"} />
        {current?.name ?? "Status"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {statuses.map((status) => (
          <DropdownMenuItem key={status.id} onClick={() => onChange(status.id)} className="justify-between">
            <span className="flex items-center gap-2">
              <StatusDot color={status.color} />
              {status.name}
            </span>
            {status.id === value ? <Check className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PriorityPicker({ value, onChange, size = "sm" }: { value: Priority; onChange: (p: Priority) => void; size?: "sm" | "xs" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size={size} className={triggerClass} />}>
        <PriorityIcon priority={value} />
        {PRIORITY_META[value].label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        {PRIORITY_ORDER.map((priority) => (
          <DropdownMenuItem key={priority} onClick={() => onChange(priority)} className="justify-between">
            <span className="flex items-center gap-2">
              <PriorityIcon priority={priority} />
              {PRIORITY_META[priority].label}
            </span>
            {priority === value ? <Check className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AssigneePicker({ profiles, value, onChange, size = "sm" }: { profiles: ProfileLite[]; value: string | null; onChange: (id: string | null) => void; size?: "sm" | "xs" }) {
  const current = profiles.find((p) => p.id === value) ?? null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size={size} className={triggerClass} />}>
        {current ? (
          <>
            <UserAvatar name={memberLabel(current)} avatarUrl={current.avatar_url} className="size-4" fallbackClassName="text-[8px]" />
            <span className="max-w-32 truncate">{memberLabel(current)}</span>
          </>
        ) : (
          <>
            <CircleUserRound className="size-3.5 text-muted-foreground" />
            Unassigned
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 min-w-48 overflow-y-auto">
        <DropdownMenuItem onClick={() => onChange(null)} className="justify-between">
          <span className="flex items-center gap-2">
            <CircleUserRound className="size-3.5 text-muted-foreground" />
            Unassigned
          </span>
          {!value ? <Check className="size-3.5" /> : null}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {profiles.map((profile) => (
          <DropdownMenuItem key={profile.id} onClick={() => onChange(profile.id)} className="justify-between">
            <span className="flex min-w-0 items-center gap-2">
              <UserAvatar name={memberLabel(profile)} avatarUrl={profile.avatar_url} className="size-4" fallbackClassName="text-[8px]" />
              <span className="truncate">{memberLabel(profile)}</span>
            </span>
            {profile.id === value ? <Check className="size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function LabelPicker({
  labels,
  value,
  onChange,
  workspaceId,
  slug,
  onLabelCreated,
}: {
  labels: LabelRow[]
  value: string[]
  onChange: (ids: string[]) => void
  workspaceId: string
  slug: string
  onLabelCreated?: (label: LabelRow) => void
}) {
  const [creating, setCreating] = React.useState(false)
  const [name, setName] = React.useState("")
  const [color, setColor] = React.useState("violet")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const selected = labels.filter((l) => value.includes(l.id))

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  async function submitNew() {
    if (!name.trim()) return
    setPending(true)
    setError(null)
    const result = await createLabel(workspaceId, slug, name, color)
    setPending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    const label: LabelRow = { ...result.label, workspace_id: workspaceId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    onLabelCreated?.(label)
    onChange([...value, label.id])
    setName("")
    setCreating(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((label) => (
          <span key={label.id} className="inline-flex items-center gap-0.5">
            <LabelChip name={label.name} color={label.color} />
            <button type="button" aria-label={`Remove label ${label.name}`} onClick={() => toggle(label.id)} className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="outline" size="xs" className="gap-1 text-muted-foreground" />}>
            <Tag className="size-3" />
            {selected.length ? "Edit labels" : "Add label"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 min-w-48 overflow-y-auto">
            {labels.length === 0 ? <p className="px-2 py-1.5 text-xs text-muted-foreground">No labels yet.</p> : null}
            {labels.map((label) => (
              <DropdownMenuItem key={label.id} closeOnClick={false} onClick={() => toggle(label.id)} className="justify-between">
                <span className="flex items-center gap-2">
                  <span aria-hidden className={cn("size-2 rounded-full", swatchClass(label.color))} />
                  {label.name}
                </span>
                {value.includes(label.id) ? <Check className="size-3.5" /> : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCreating(true)}>
              <Plus />
              New label
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {creating ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-2.5">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Label name" autoFocus maxLength={40} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submitNew() } }} />
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Label color">
            {COLOR_NAMES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={c === color} aria-label={c} onClick={() => setColor(c)} className={cn("size-5 rounded-full ring-offset-2 ring-offset-background", swatchClass(c), c === color && "ring-2 ring-foreground")} />
            ))}
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="xs" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="button" size="xs" disabled={pending || !name.trim()} onClick={() => void submitNew()}>{pending ? "Creating…" : "Create label"}</Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
