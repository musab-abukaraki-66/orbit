"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, Check, ExternalLink, MoreHorizontal, Pencil, Trash2, X } from "lucide-react"

import { addComment, deleteComment, deleteItem, editComment, updateItem } from "@/lib/items/actions"
import type { ActivityRow, CommentRow, ItemPayload, LabelRow, Priority, ProfileLite, StatusRow } from "@/lib/items/types"
import { memberLabel } from "@/lib/members/format"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ActivityFeed } from "@/components/items/activity-feed"
import { timeAgo } from "@/components/items/meta"
import { AssigneePicker, LabelPicker, PriorityPicker, StatusPicker } from "@/components/items/pickers"
import { LiveRefresh } from "@/components/realtime/use-live-refresh"
import { UserAvatar } from "@/components/user-avatar"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export type ItemDetailProps = {
  slug: string
  workspaceId: string
  projectSlug: string
  projectName: string
  item: ItemPayload
  statuses: StatusRow[]
  labels: LabelRow[]
  profiles: ProfileLite[]
  comments: CommentRow[]
  activity: ActivityRow[]
  currentUserId: string
  isAdmin: boolean
  onClose?: () => void
  standalone?: boolean
}

export function ItemDetail(props: ItemDetailProps) {
  const { slug, workspaceId, projectSlug, projectName, item, statuses, profiles, comments, activity, currentUserId, isAdmin, onClose, standalone } = props
  const router = useRouter()
  const [labels, setLabels] = React.useState(props.labels)
  const [title, setTitle] = React.useState(item.title)
  const [description, setDescription] = React.useState(item.description ?? "")
  const [editingDescription, setEditingDescription] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const [seen, setSeen] = React.useState({ title: item.title, description: item.description, labels: props.labels })
  if (seen.title !== item.title || seen.description !== item.description || seen.labels !== props.labels) {
    setSeen({ title: item.title, description: item.description, labels: props.labels })
    if (seen.title !== item.title) setTitle(item.title)
    if (seen.description !== item.description && !editingDescription) setDescription(item.description ?? "")
    if (seen.labels !== props.labels) setLabels(props.labels)
  }

  const profilesById = React.useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])
  const creator = item.created_by ? profilesById.get(item.created_by) ?? null : null

  async function save(patch: Parameters<typeof updateItem>[2]) {
    setSaving(true)
    setError(null)
    try {
      const result = await updateItem(item.id, slug, patch)
      if (!result.ok) {
        setError(result.message)
        setTitle(item.title)
      } else {
        router.refresh()
      }
    } catch {
      setError("Could not save — check your connection and try again.")
      setTitle(item.title)
    } finally {
      setSaving(false)
    }
  }

  const itemPath = `/w/${slug}/items/${item.key}`

  return (
    <div className="flex h-full min-h-0 flex-col">
      <LiveRefresh
        channelKey={`item-${item.id}`}
        subscriptions={[
          { table: "comments", filter: `work_item_id=eq.${item.id}` },
          { table: "work_items", filter: `id=eq.${item.id}` },
          { table: "work_item_labels", filter: `work_item_id=eq.${item.id}` },
          { table: "activity_log", filter: `work_item_id=eq.${item.id}` },
        ]}
      />
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Link href={`/w/${slug}/projects/${projectSlug}`} className="truncate text-xs text-muted-foreground hover:text-foreground">
          {projectName}
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <span className="font-mono text-xs text-muted-foreground">{item.key}</span>
        <div className="ml-auto flex items-center gap-1">
          {!standalone ? (
            <Button variant="ghost" size="icon-sm" aria-label="Open full page" render={<Link href={itemPath} />}>
              <ExternalLink className="size-4" />
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Task actions" />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem
                onClick={() => {
                  void navigator.clipboard?.writeText(`${window.location.origin}${itemPath}`)
                }}
              >
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
                {isAdmin || item.created_by === currentUserId ? "Delete task" : "Archive task"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {onClose ? (
            <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title.trim() !== item.title) void save({ title })
            else setTitle(item.title)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur()
          }}
          aria-label="Title"
          className="h-auto border-transparent bg-transparent px-1 text-lg font-semibold tracking-tight shadow-none hover:border-input focus-visible:border-input dark:bg-transparent"
        />

        <div className="flex flex-wrap items-center gap-2">
          <StatusPicker statuses={statuses} value={item.status_id} onChange={(status_id) => void save({ status_id })} />
          <PriorityPicker value={item.priority} onChange={(priority: Priority) => void save({ priority })} />
          <AssigneePicker profiles={profiles} value={item.assignee_id} onChange={(assignee_id) => void save({ assignee_id })} />
          <label className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2 text-xs dark:bg-input/30">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <input
              type="date"
              value={item.due_date ?? ""}
              onChange={(e) => void save({ due_date: e.target.value || null })}
              className="bg-transparent outline-none"
              aria-label="Due date"
            />
          </label>
        </div>

        <LabelPicker
          labels={labels}
          value={item.label_ids}
          onChange={(label_ids) => void save({ label_ids })}
          workspaceId={workspaceId}
          slug={slug}
          onLabelCreated={(label) => setLabels((prev) => [...prev, label])}
        />

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Description</h3>
            {!editingDescription ? (
              <Button variant="ghost" size="xs" onClick={() => setEditingDescription(true)}>
                <Pencil className="size-3" />
                Edit
              </Button>
            ) : null}
          </div>
          {editingDescription ? (
            <div className="flex flex-col gap-2">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} autoFocus placeholder="Add context, links, acceptance criteria…" />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setDescription(item.description ?? ""); setEditingDescription(false) }}>Cancel</Button>
                <Button size="sm" disabled={saving} onClick={async () => { await save({ description }); setEditingDescription(false) }}>
                  <Check className="size-3.5" />
                  Save
                </Button>
              </div>
            </div>
          ) : item.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{item.description}</p>
          ) : (
            <button type="button" onClick={() => setEditingDescription(true)} className="rounded-lg border border-dashed border-border px-3 py-3 text-left text-sm text-muted-foreground hover:bg-muted/40">
              No description yet. Click to add one.
            </button>
          )}
        </section>

        {error ? <Alert>{error}</Alert> : null}

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Activity</h3>
          <Timeline comments={comments} activity={activity} profiles={profiles} currentUserId={currentUserId} isAdmin={isAdmin} slug={slug} onChanged={() => router.refresh()} />
          <CommentComposer itemId={item.id} slug={slug} profiles={profiles} onPosted={() => router.refresh()} />
        </section>

        <p className="text-xs text-muted-foreground">
          Created {timeAgo(item.created_at)}{creator ? ` by ${memberLabel(creator)}` : ""} · Updated {timeAgo(item.updated_at)}
        </p>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={isAdmin || item.created_by === currentUserId ? "Delete task" : "Archive task"}
        description={`${item.key} “${item.title}” will be removed from the board.`}
        confirmLabel={isAdmin || item.created_by === currentUserId ? "Delete task" : "Archive task"}
        onConfirm={async () => {
          const result = await deleteItem(item.id, slug)
          return result.ok ? undefined : { ok: false, message: result.message }
        }}
        onSuccess={() => {
          if (onClose) onClose()
          else router.push(`/w/${slug}/projects/${projectSlug}`)
          router.refresh()
        }}
      />
    </div>
  )
}

type TimelineEntry = { kind: "comment"; at: string; comment: CommentRow } | { kind: "activity"; at: string; row: ActivityRow }

function Timeline({
  comments,
  activity,
  profiles,
  currentUserId,
  isAdmin,
  slug,
  onChanged,
}: {
  comments: CommentRow[]
  activity: ActivityRow[]
  profiles: ProfileLite[]
  currentUserId: string
  isAdmin: boolean
  slug: string
  onChanged: () => void
}) {
  const entries: TimelineEntry[] = [
    ...comments.map((comment) => ({ kind: "comment" as const, at: comment.created_at, comment })),
    ...activity.filter((row) => row.action !== "comment_added").map((row) => ({ kind: "activity" as const, at: row.created_at, row })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No activity yet.</p>

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) =>
        entry.kind === "activity" ? (
          <li key={`a-${entry.row.id}`}>
            <ActivityFeed rows={[entry.row]} profiles={profiles} slug={slug} compact />
          </li>
        ) : (
          <li key={`c-${entry.comment.id}`}>
            <CommentView comment={entry.comment} profiles={profiles} canEdit={entry.comment.author_id === currentUserId} canDelete={entry.comment.author_id === currentUserId || isAdmin} slug={slug} onChanged={onChanged} />
          </li>
        ),
      )}
    </ol>
  )
}

function CommentView({
  comment,
  profiles,
  canEdit,
  canDelete,
  slug,
  onChanged,
}: {
  comment: CommentRow
  profiles: ProfileLite[]
  canEdit: boolean
  canDelete: boolean
  slug: string
  onChanged: () => void
}) {
  const author = comment.author_id ? profiles.find((p) => p.id === comment.author_id) ?? null : null
  const [editing, setEditing] = React.useState(false)
  const [body, setBody] = React.useState(comment.body)
  const [error, setError] = React.useState<string | null>(null)

  return (
    <div className="flex items-start gap-2.5">
      <UserAvatar name={author ? memberLabel(author) : "?"} avatarUrl={author?.avatar_url} className="mt-0.5 size-5" fallbackClassName="text-[9px]" />
      <div className="min-w-0 flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{author ? memberLabel(author) : "Unknown"}</span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(comment.created_at)}
            {comment.edited_at ? " · edited" : ""}
          </span>
          {(canEdit || canDelete) && !editing ? (
            <div className="ml-auto flex gap-0.5">
              {canEdit ? (
                <Button variant="ghost" size="icon-xs" aria-label="Edit comment" onClick={() => setEditing(true)}>
                  <Pencil className="size-3" />
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Delete comment"
                  onClick={async () => {
                    const result = await deleteComment(comment.id, slug)
                    if (!result.ok) setError(result.message ?? "Could not delete.")
                    else onChanged()
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {editing ? (
          <div className="mt-2 flex flex-col gap-2">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="xs" onClick={() => { setBody(comment.body); setEditing(false) }}>Cancel</Button>
              <Button
                size="xs"
                onClick={async () => {
                  const result = await editComment(comment.id, slug, body)
                  if (!result.ok) setError(result.message ?? "Could not save.")
                  else {
                    setEditing(false)
                    onChanged()
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{renderMentions(comment.body, profiles)}</p>
        )}
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  )
}

function renderMentions(body: string, profiles: ProfileLite[]) {
  const names = profiles.map((p) => memberLabel(p)).filter(Boolean).sort((a, b) => b.length - a.length)
  if (names.length === 0) return body
  const pattern = new RegExp(`@(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g")
  const parts = body.split(pattern)
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="rounded bg-brand/15 px-1 font-medium text-brand">
        @{part}
      </span>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    ),
  )
}

export function CommentComposer({ itemId, slug, profiles, onPosted }: { itemId: string; slug: string; profiles: ProfileLite[]; onPosted: () => void }) {
  const [body, setBody] = React.useState("")
  const [mentions, setMentions] = React.useState<string[]>([])
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const suggestions = mentionQuery !== null
    ? profiles.filter((p) => memberLabel(p).toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : []

  function handleChange(value: string) {
    setBody(value)
    const caret = textareaRef.current?.selectionStart ?? value.length
    const before = value.slice(0, caret)
    const match = before.match(/(?:^|\s)@([^\s@]*)$/)
    setMentionQuery(match ? match[1] : null)
  }

  function pick(profile: ProfileLite) {
    const name = memberLabel(profile)
    const caret = textareaRef.current?.selectionStart ?? body.length
    const before = body.slice(0, caret).replace(/@([^\s@]*)$/, `@${name} `)
    const after = body.slice(caret)
    setBody(before + after)
    setMentions((prev) => (prev.includes(profile.id) ? prev : [...prev, profile.id]))
    setMentionQuery(null)
    textareaRef.current?.focus()
  }

  async function submit() {
    if (!body.trim()) return
    setPending(true)
    setError(null)
    const present = mentions.filter((id) => {
      const profile = profiles.find((p) => p.id === id)
      return profile && body.includes(`@${memberLabel(profile)}`)
    })
    const result = await addComment(itemId, slug, body, present)
    setPending(false)
    if (!result.ok) {
      setError(result.message ?? "Could not post the comment.")
      return
    }
    setBody("")
    setMentions([])
    onPosted()
  }

  return (
    <div className="relative flex flex-col gap-2">
      <Textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault()
            void submit()
          }
          if (e.key === "Escape") setMentionQuery(null)
        }}
        rows={3}
        placeholder="Leave a comment… Type @ to mention a teammate."
        aria-label="New comment"
      />
      {suggestions.length > 0 ? (
        <ul className="absolute right-0 bottom-12 left-0 z-10 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-md" role="listbox">
          {suggestions.map((profile) => (
            <li key={profile.id}>
              <button type="button" role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); pick(profile) }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
                <UserAvatar name={memberLabel(profile)} avatarUrl={profile.avatar_url} className="size-5" fallbackClassName="text-[9px]" />
                {memberLabel(profile)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">⌘/Ctrl + Enter to post</span>
        <Button size="sm" disabled={pending || !body.trim()} onClick={() => void submit()} className={cn(pending && "opacity-70")}>
          {pending ? "Posting…" : "Comment"}
        </Button>
      </div>
    </div>
  )
}
