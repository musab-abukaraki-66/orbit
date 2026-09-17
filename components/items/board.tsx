"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Plus, Wifi, WifiOff } from "lucide-react"

import { moveItem } from "@/lib/items/actions"
import type { ItemPayload, LabelRow, ProfileLite, StatusRow } from "@/lib/items/types"
import { createClient } from "@/lib/supabase/client"
import { ensureRealtimeAuth } from "@/lib/supabase/realtime"
import { cn } from "@/lib/utils"
import { CurrentUserContext, ItemCard } from "@/components/items/item-card"
import { ItemCreateDialog } from "@/components/items/item-create-dialog"
import { StatusDot } from "@/components/items/meta"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type Props = {
  slug: string
  workspaceId: string
  projectId: string
  projectSlug: string
  statuses: StatusRow[]
  initialItems: ItemPayload[]
  labels: LabelRow[]
  profiles: ProfileLite[]
  commentCounts: Record<string, number>
  openCreate?: boolean
  filterAssignee?: string | null
  currentUserId?: string | null
}

function byPosition(a: ItemPayload, b: ItemPayload) {
  return a.position - b.position || a.created_at.localeCompare(b.created_at)
}

export function Board({ slug, workspaceId, projectId, projectSlug, statuses, initialItems, labels: initialLabels, profiles, commentCounts, openCreate, filterAssignee, currentUserId = null }: Props) {
  const router = useRouter()
  const [items, setItems] = React.useState<ItemPayload[]>(initialItems)
  const [labels, setLabels] = React.useState(initialLabels)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [live, setLive] = React.useState<"connecting" | "live" | "error">("connecting")
  const [createFor, setCreateFor] = React.useState<string | null>(openCreate ? (statuses.find((s) => s.is_default)?.id ?? statuses[0]?.id ?? null) : null)
  const dragging = React.useRef(false)
  // Channel topics must be unique per mount: the browser client is a singleton
  // and supabase.channel(topic) hands back an existing (possibly being-removed)
  // channel for a reused topic, which silently kills the subscription.
  const channelId = React.useId()
  const profilesRef = React.useRef(profiles)
  React.useEffect(() => {
    profilesRef.current = profiles
  }, [profiles])
  const snapshot = React.useRef<ItemPayload[] | null>(null)
  const pendingIds = React.useRef(new Set<string>())
  const queued = React.useRef<Array<() => void>>([])

  // Server props arrive after every router.refresh(), but a refresh that
  // started before a live change can land after it. Merge by version so a
  // stale render never regresses a row the realtime channel already updated,
  // and keep rows that only arrived live recently.
  const liveSeen = React.useRef(new Map<string, number>())
  React.useEffect(() => {
    if (dragging.current) return
    setItems((prev) => {
      const local = new Map(prev.map((i) => [i.id, i]))
      const merged = initialItems.map((row) => {
        const mine = local.get(row.id)
        return mine && mine.version > row.version ? mine : row
      })
      const known = new Set(initialItems.map((i) => i.id))
      const cutoff = Date.now() - 60_000
      for (const item of prev) {
        if (!known.has(item.id) && (liveSeen.current.get(item.id) ?? 0) > cutoff) merged.push(item)
      }
      return merged
    })
  }, [initialItems])
  const [seenLabels, setSeenLabels] = React.useState(initialLabels)
  if (seenLabels !== initialLabels) {
    setSeenLabels(initialLabels)
    setLabels(initialLabels)
  }

  const upsert = React.useCallback((row: ItemPayload) => {
    liveSeen.current.set(row.id, Date.now())
    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === row.id)
      if (index === -1) return [...prev, row]
      const existing = prev[index]
      if (existing.version > row.version) return prev
      const next = [...prev]
      next[index] = { ...row, label_ids: row.label_ids ?? existing.label_ids }
      return next
    })
  }, [])
  const remove = React.useCallback((id: string) => {
    liveSeen.current.delete(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  React.useEffect(() => {
    const supabase = createClient()
    const apply = (fn: () => void) => {
      if (dragging.current) queued.current.push(fn)
      else fn()
    }
    let wasDown = false
    const channel = supabase
      .channel(`board-${projectId}-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "work_items", filter: `project_id=eq.${projectId}` }, (payload) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id
          if (id) apply(() => remove(id))
          return
        }
        const row = payload.new as ItemPayload
        if (pendingIds.current.has(row.id)) return
        if (row.archived_at) {
          apply(() => remove(row.id))
          return
        }
        apply(() => upsert({ ...row, label_ids: (row as Partial<ItemPayload>).label_ids ?? [] }))
        if (payload.eventType === "INSERT" || (row.assignee_id && !profilesRef.current.some((p) => p.id === row.assignee_id))) {
          router.refresh()
        }
      })

    let cancelled = false
    void ensureRealtimeAuth(supabase).then(() => {
      if (cancelled) return
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLive("live")
          if (wasDown) router.refresh()
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          wasDown = true
          setLive("error")
        }
      })
    })
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisible)
      void supabase.removeChannel(channel)
    }
  }, [projectId, channelId, remove, router, upsert])

  const visibleItems = React.useMemo(
    () => (filterAssignee ? items.filter((i) => (filterAssignee === "unassigned" ? !i.assignee_id : i.assignee_id === filterAssignee)) : items),
    [items, filterAssignee],
  )
  const byStatus = React.useMemo(() => {
    const map = new Map<string, ItemPayload[]>()
    for (const status of statuses) map.set(status.id, [])
    for (const item of visibleItems) {
      const list = map.get(item.status_id)
      if (list) list.push(item)
    }
    for (const list of map.values()) list.sort(byPosition)
    return map
  }, [statuses, visibleItems])

  const profilesById = React.useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])
  const labelsById = React.useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels])
  const itemsById = React.useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const findStatusFor = (id: string) => (statuses.some((s) => s.id === id) ? id : itemsById.get(id)?.status_id ?? null)

  function placeAt(list: ItemPayload[], id: string, statusId: string, index: number): ItemPayload[] {
    const active = list.find((i) => i.id === id)
    if (!active) return list
    const others = list.filter((i) => i.id !== id)
    const lane = others.filter((i) => i.status_id === statusId).sort(byPosition)
    const clamped = Math.max(0, Math.min(index, lane.length))
    const before = clamped > 0 ? lane[clamped - 1].position : null
    const after = clamped < lane.length ? lane[clamped].position : null
    const position = before === null && after === null ? 1024 : before === null ? after! - 1024 : after === null ? before + 1024 : (before + after) / 2
    return [...others, { ...active, status_id: statusId, position }]
  }

  function onDragStart(event: DragStartEvent) {
    dragging.current = true
    snapshot.current = items
    setActiveId(String(event.active.id))
    setError(null)
  }

  // Only cross-lane moves are applied while hovering; same-lane reordering is
  // previewed by SortableContext and committed in onDragEnd. Reordering here
  // too makes the hovered card shift under the pointer and oscillate forever.
  function onDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const id = String(active.id)
    const overId = String(over.id)
    const statusId = findStatusFor(overId)
    const current = itemsById.get(id)
    if (!statusId || !current || current.status_id === statusId) return
    const lane = byStatus.get(statusId) ?? []
    let index = lane.length
    if (overId !== statusId) {
      const overIndex = lane.findIndex((i) => i.id === overId)
      if (overIndex !== -1) {
        const translated = active.rect.current.translated
        const below = translated ? translated.top > over.rect.top + over.rect.height / 2 : false
        index = overIndex + (below ? 1 : 0)
      }
    }
    setItems((prev) => placeAt(prev, id, statusId, index))
  }

  function finishDrag() {
    dragging.current = false
    setActiveId(null)
    const fns = queued.current
    queued.current = []
    for (const fn of fns) fn()
  }

  function restore() {
    if (snapshot.current) setItems(snapshot.current)
    snapshot.current = null
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const id = String(active.id)
    if (!over) {
      restore()
      finishDrag()
      return
    }
    const overId = String(over.id)
    const statusId = findStatusFor(overId)
    if (!statusId) {
      restore()
      finishDrag()
      return
    }
    // The active card is already in the target lane if it crossed lanes during
    // the drag; a same-lane drop follows arrayMove semantics (land on the
    // hovered card's index).
    const lane = byStatus.get(statusId) ?? []
    const activeIndex = lane.findIndex((i) => i.id === id)
    const overIndex = overId === statusId ? -1 : lane.findIndex((i) => i.id === overId)
    const index = overIndex !== -1 ? overIndex : activeIndex !== -1 ? activeIndex : lane.length

    setItems((prev) => placeAt(prev, id, statusId, index))
    pendingIds.current.add(id)
    finishDrag()
    const result = await moveItem(id, slug, statusId, index)
    pendingIds.current.delete(id)
    if (!result.ok) {
      restore()
      setError(result.message)
      return
    }
    snapshot.current = null
    upsert(result.item)
  }

  const activeItem = activeId ? itemsById.get(activeId) ?? null : null
  const createStatus = createFor ? statuses.find((s) => s.id === createFor) ?? null : null

  return (
    <CurrentUserContext.Provider value={currentUserId}>
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="hidden text-xs text-muted-foreground sm:block">Drag cards between columns. Click a card to open it.</p>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            live === "live" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            live === "connecting" && "border-border bg-muted text-muted-foreground",
            live === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {live === "error" ? <WifiOff className="size-3" /> : <Wifi className="size-3" />}
          {live === "live" ? "Live" : live === "connecting" ? "Connecting…" : "Reconnecting…"}
        </span>
      </div>
      {error ? (
        <Alert>
          <span className="flex items-center justify-between gap-3">
            {error}
            <Button variant="ghost" size="xs" onClick={() => setError(null)}>Dismiss</Button>
          </span>
        </Alert>
      ) : null}

      <DndContext id={`dnd-${projectId}`} sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { restore(); finishDrag() }}>
        <div className="relative flex min-h-0 flex-1 items-start gap-3 overflow-x-auto pb-2">
          {statuses.map((status) => (
            <Column
              key={status.id}
              status={status}
              items={byStatus.get(status.id) ?? []}
              profilesById={profilesById}
              labelsById={labelsById}
              commentCounts={commentCounts}
              onOpen={(item) => router.push(`/w/${slug}/projects/${projectSlug}?item=${item.key}`, { scroll: false })}
              onAdd={() => setCreateFor(status.id)}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <ItemCard
              item={activeItem}
              assignee={activeItem.assignee_id ? profilesById.get(activeItem.assignee_id) ?? null : null}
              labels={activeItem.label_ids.map((id) => labelsById.get(id)).filter((l): l is LabelRow => Boolean(l))}
              dragging
              className="w-64"
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <ItemCreateDialog
        open={createFor !== null}
        onOpenChange={(open) => {
          if (!open) setCreateFor(null)
        }}
        slug={slug}
        workspaceId={workspaceId}
        projectId={projectId}
        statuses={statuses}
        defaultStatusId={createStatus?.id ?? null}
        labels={labels}
        profiles={profiles}
        onLabelCreated={(label) => setLabels((prev) => [...prev, label])}
        onCreated={(item) => {
          pendingIds.current.add(item.id)
          upsert(item)
          setTimeout(() => pendingIds.current.delete(item.id), 2000)
        }}
      />
    </div>
    </CurrentUserContext.Provider>
  )

}

function Column({
  status,
  items,
  profilesById,
  labelsById,
  commentCounts,
  onOpen,
  onAdd,
}: {
  status: StatusRow
  items: ItemPayload[]
  profilesById: Map<string, ProfileLite>
  labelsById: Map<string, LabelRow>
  commentCounts: Record<string, number>
  onOpen: (item: ItemPayload) => void
  onAdd: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id })
  return (
    <div className="flex max-h-full w-64 shrink-0 flex-col rounded-xl bg-muted/40">
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
        <StatusDot color={status.color} />
        <h2 className="truncate text-[13px] font-medium">{status.name}</h2>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{items.length}</span>
        <Button variant="ghost" size="icon-xs" aria-label={`Add task to ${status.name}`} onClick={onAdd} className="text-muted-foreground">
          <Plus className="size-3.5" />
        </Button>
      </div>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={cn("flex min-h-10 flex-1 flex-col gap-2 overflow-y-auto rounded-lg p-2 transition-colors", isOver && "bg-muted/70")}>
          {items.length === 0 ? (
            <div className="flex min-h-16 flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground/70">
              Drop tasks here
            </div>
          ) : (
            items.map((item) => (
              <SortableCard
                key={item.id}
                item={item}
                assignee={item.assignee_id ? profilesById.get(item.assignee_id) ?? null : null}
                labels={item.label_ids.map((id) => labelsById.get(id)).filter((l): l is LabelRow => Boolean(l))}
                commentCount={commentCounts[item.id]}
                onOpen={() => onOpen(item)}
              />
            ))
          )}
        </div>
      </SortableContext>
      <div className="p-2 pt-1">
        <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={onAdd}>
          <Plus className="size-3.5" />
          New task
        </Button>
      </div>
    </div>
  )
}

function SortableCard({ item, assignee, labels, commentCount, onOpen }: { item: ItemPayload; assignee: ProfileLite | null; labels: LabelRow[]; commentCount?: number; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Translate.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn("touch-none rounded-lg outline-none", isDragging && "opacity-40")}>
      <ItemCard item={item} assignee={assignee} labels={labels} commentCount={commentCount} onOpen={onOpen} />
    </div>
  )
}
