"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { CircleAlert, Columns3, List, Wifi, WifiOff } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { moveTask } from "@/lib/tasks/actions"
import type {
  ColumnPayload,
  LabelPayload,
  ProfilePayload,
  TaskLabelIdsByTask,
  TaskPayload,
} from "@/lib/tasks/types"
import { BoardColumn } from "@/components/kanban/board-column"
import { TaskCard } from "@/components/kanban/task-card"
import { TaskFormDialog } from "@/components/kanban/task-form-dialog"
import { TaskList } from "@/components/kanban/task-list"
import { Button } from "@/components/ui/button"

type BoardDialog =
  | { mode: "create"; columnId: string }
  | { mode: "edit"; task: TaskPayload }

type BoardView = "board" | "list"

function byPosition(a: TaskPayload, b: TaskPayload): number {
  if (a.position !== b.position) return a.position - b.position
  const created = a.created_at.localeCompare(b.created_at)
  if (created !== 0) return created
  return a.id < b.id ? -1 : 1
}

function isSameTask(a: TaskPayload, b: TaskPayload): boolean {
  return (
    a.column_id === b.column_id &&
    a.position === b.position &&
    a.title === b.title &&
    a.description === b.description &&
    a.priority === b.priority &&
    a.status === b.status &&
    a.assignee_id === b.assignee_id &&
    a.due_date === b.due_date &&
    a.updated_at === b.updated_at
  )
}

export function KanbanBoard({
  boardId,
  columns,
  initialTasks,
  initialProfiles,
  initialLabels,
  initialTaskLabels,
}: {
  boardId: string
  columns: ColumnPayload[]
  initialTasks: TaskPayload[]
  initialProfiles: ProfilePayload[]
  initialLabels: LabelPayload[]
  initialTaskLabels: TaskLabelIdsByTask
}) {
  const [tasks, setTasks] = React.useState<TaskPayload[]>(initialTasks)
  const [profiles, setProfiles] =
    React.useState<ProfilePayload[]>(initialProfiles)
  const [labels, setLabels] = React.useState<LabelPayload[]>(initialLabels)
  const [taskLabelIds, setTaskLabelIds] =
    React.useState<TaskLabelIdsByTask>(initialTaskLabels)
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null)
  const [dialog, setDialog] = React.useState<BoardDialog | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [live, setLive] = React.useState<"connecting" | "live" | "error">(
    "connecting",
  )
  const [view, setView] = React.useState<BoardView>("board")

  const snapshotRef = React.useRef<TaskPayload[] | null>(null)
  const activeDragRef = React.useRef(false)

  const profilesById = React.useMemo(() => {
    const map = new Map<string, ProfilePayload>()
    for (const profile of profiles) map.set(profile.id, profile)
    return map
  }, [profiles])

  const profilesByIdRef = React.useRef(profilesById)
  React.useEffect(() => {
    profilesByIdRef.current = profilesById
  }, [profilesById])

  const labelsById = React.useMemo(() => {
    const map = new Map<string, LabelPayload>()
    for (const label of labels) map.set(label.id, label)
    return map
  }, [labels])

  // Resolved label objects per task, stable per task so memoized cards only
  // re-render when a task's own label set changes.
  const labelsByTask = React.useMemo(() => {
    const map = new Map<string, LabelPayload[]>()
    for (const task of tasks) {
      const ids = taskLabelIds[task.id]
      if (!ids || ids.length === 0) continue
      const resolved = ids
        .map((id) => labelsById.get(id))
        .filter((label): label is LabelPayload => Boolean(label))
      if (resolved.length > 0) map.set(task.id, resolved)
    }
    return map
  }, [tasks, taskLabelIds, labelsById])

  async function refreshProfiles() {
    const supabase = createClient()
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
    if (data) {
      setProfiles((prev) => {
        const map = new Map(prev.map((profile) => [profile.id, profile]))
        for (const profile of data as ProfilePayload[]) {
          map.set(profile.id, profile)
        }
        return [...map.values()]
      })
    }
  }

  function sortedTasksInColumn(columnId: string): TaskPayload[] {
    return tasks
      .filter((task) => task.column_id === columnId)
      .sort(byPosition)
  }

  function findColumnForId(id: string): string | null {
    if (columns.some((column) => column.id === id)) return id
    return tasks.find((task) => task.id === id)?.column_id ?? null
  }

  function upsertTask(
    list: TaskPayload[],
    incoming: TaskPayload,
  ): TaskPayload[] {
    const exists = list.some((task) => task.id === incoming.id)
    if (!exists) return [...list, incoming]
    return list.map((task) => (task.id === incoming.id ? incoming : task))
  }

  const upsertTaskWithLabels = React.useCallback(
    (task: TaskPayload, labelIds: string[]) => {
      setTasks((prev) => upsertTask(prev, task))
      setTaskLabelIds((prev) => ({ ...prev, [task.id]: labelIds }))
    },
    [],
  )

  const removeTask = React.useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId))
    setTaskLabelIds((prev) => {
      if (!(taskId in prev)) return prev
      const next = { ...prev }
      delete next[taskId]
      return next
    })
  }, [])

  // Place `activeId` at `insertIndex` inside `overColumnId` by giving it a
  // position between its new neighbours (mirrors the server-side midpoint).
  function placeTaskAt(
    list: TaskPayload[],
    activeId: string,
    overColumnId: string,
    insertIndex: number,
  ): TaskPayload[] {
    const active = list.find((task) => task.id === activeId)
    if (!active) return list
    const others = list.filter((task) => task.id !== activeId)
    const columnOthers = others
      .filter((task) => task.column_id === overColumnId)
      .sort(byPosition)
    const index = Math.min(Math.max(insertIndex, 0), columnOthers.length)
    const prev = index > 0 ? columnOthers[index - 1] : null
    const next = index < columnOthers.length ? columnOthers[index] : null

    let position: number
    if (prev && next) position = (prev.position + next.position) / 2
    else if (prev) position = prev.position + 1
    else if (next) position = next.position - 1
    else position = 1

    return [...others, { ...active, column_id: overColumnId, position }]
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const tasksByColumn = React.useMemo(() => {
    const map = new Map<string, TaskPayload[]>()
    for (const column of columns) {
      map.set(
        column.id,
        tasks.filter((task) => task.column_id === column.id).sort(byPosition),
      )
    }
    return map
  }, [columns, tasks])

  const columnOrder = React.useMemo(
    () => new Map(columns.map((column, index) => [column.id, index])),
    [columns],
  )

  // Flat, deterministic ordering for the List view: column order first, then
  // the same position tie-break used by the board.
  const listTasks = React.useMemo(() => {
    return [...tasks].sort((a, b) => {
      const ca = columnOrder.get(a.column_id) ?? 0
      const cb = columnOrder.get(b.column_id) ?? 0
      if (ca !== cb) return ca - cb
      const by = byPosition(a, b)
      return by !== 0 ? by : (a.id < b.id ? -1 : 1)
    })
  }, [tasks, columnOrder])

  const handleAddTask = React.useCallback((columnId: string) => {
    setDialog({ mode: "create", columnId })
  }, [])

  const handleEditTask = React.useCallback((task: TaskPayload) => {
    setDialog({ mode: "edit", task })
  }, [])

  const handleDeleteTask = React.useCallback(
    (taskId: string) => {
      removeTask(taskId)
    },
    [removeTask],
  )

  const handleLabelCreated = React.useCallback((label: LabelPayload) => {
    setLabels((prev) =>
      prev.some((existing) => existing.id === label.id)
        ? prev
        : [...prev, label],
    )
  }, [])

  const handleCreated = React.useCallback(
    (task: TaskPayload, labelIds: string[]) => {
      upsertTaskWithLabels(task, labelIds)
      setDialog(null)
    },
    [upsertTaskWithLabels],
  )

  const handleUpdated = React.useCallback(
    (task: TaskPayload, labelIds: string[]) => {
      upsertTaskWithLabels(task, labelIds)
      setDialog(null)
    },
    [upsertTaskWithLabels],
  )

  function restoreSnapshot() {
    if (snapshotRef.current) setTasks(snapshotRef.current)
    snapshotRef.current = null
  }

  function handleDragStart(event: DragStartEvent) {
    activeDragRef.current = true
    setActiveTaskId(String(event.active.id))
    snapshotRef.current = tasks
    setError(null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const activeTask = tasks.find((task) => task.id === activeId)
    if (!activeTask) return
    const overId = String(over.id)
    const overColumnId = findColumnForId(overId)
    if (!overColumnId || activeTask.column_id === overColumnId) return

    const columnTasks = sortedTasksInColumn(overColumnId)
    let insertIndex = columnTasks.length
    if (overId !== overColumnId) {
      const index = columnTasks.findIndex((task) => task.id === overId)
      if (index !== -1) insertIndex = index
    }
    setTasks((prev) => placeTaskAt(prev, activeId, overColumnId, insertIndex))
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const activeId = String(active.id)
    activeDragRef.current = false
    setActiveTaskId(null)

    if (!over) {
      restoreSnapshot()
      return
    }

    const overId = String(over.id)
    const activeTask = tasks.find((task) => task.id === activeId)
    const overColumnId = findColumnForId(overId)
    if (!activeTask || !overColumnId) {
      restoreSnapshot()
      return
    }

    const activeColumnId = activeTask.column_id
    const list = sortedTasksInColumn(overColumnId)

    let targetIndex: number
    if (overId === overColumnId) {
      targetIndex = list.length
    } else {
      targetIndex = list.findIndex((task) => task.id === overId)
      if (targetIndex === -1) targetIndex = list.length
    }
    if (activeColumnId !== overColumnId) {
      const activeIndex = list.findIndex((task) => task.id === activeId)
      if (activeIndex !== -1) targetIndex = activeIndex
    }

    const result = await moveTask(activeId, overColumnId, targetIndex)
    if (!result?.ok) {
      restoreSnapshot()
      setError(result?.message ?? "Couldn't save the task move. Try again.")
      return
    }
    snapshotRef.current = null
    const savedTask = result.task
    if (savedTask) {
      setTasks((prev) => upsertTask(prev, savedTask))
    }
  }

  function handleDragCancel() {
    activeDragRef.current = false
    setActiveTaskId(null)
    restoreSnapshot()
  }

  // Realtime: subscribe only to this board's tasks.
  React.useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`board-tasks-${boardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (activeDragRef.current) return
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id?: string } | null)?.id
            if (oldId) {
              removeTask(oldId)
            }
            return
          }
          const row = payload.new as TaskPayload | null
          if (row) {
            setTasks((prev) => {
              const existing = prev.find((task) => task.id === row.id)
              if (existing && isSameTask(existing, row)) return prev
              return upsertTask(prev, row)
            })
            if (
              row.assignee_id &&
              !profilesByIdRef.current.has(row.assignee_id)
            ) {
              void refreshProfiles()
            }
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLive("live")
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setLive("error")
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [boardId, removeTask])

  const activeTask = activeTaskId
    ? tasks.find((task) => task.id === activeTaskId)
    : null

  const dialogColumnId =
    dialog?.mode === "create" ? dialog.columnId : columns[0]?.id ?? ""

  const viewToggle = (
    <div
      role="tablist"
      aria-label="Board view"
      className="inline-flex h-7 items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5 transition-colors duration-150 ease-out"
    >
      <Button
        type="button"
        role="tab"
        aria-selected={view === "board"}
        variant={view === "board" ? "secondary" : "ghost"}
        size="sm"
        className="h-6 gap-1.5"
        onClick={() => setView("board")}
      >
        <Columns3 className="size-3.5" />
        Board
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={view === "list"}
        variant={view === "list" ? "secondary" : "ghost"}
        size="sm"
        className="h-6 gap-1.5"
        onClick={() => setView("list")}
      >
        <List className="size-3.5" />
        List
      </Button>
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Drag cards between columns to update their status and position.
        </span>
        <div className="ml-auto flex items-center gap-3">
          {viewToggle}
          <span
            className={
              live === "live"
                ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600"
                : live === "error"
                  ? "inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
                  : "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            }
          >
            {live === "live" ? (
              <Wifi className="size-3" />
            ) : (
              <WifiOff className="size-3" />
            )}
            {live === "live"
              ? "Live"
              : live === "error"
                ? "Realtime unavailable"
                : "Connecting…"}
          </span>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span className="flex items-center gap-2">
            <CircleAlert className="size-4 shrink-0" />
            {error}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-destructive"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      ) : null}

      <div
        key={view}
        className="flex min-h-0 flex-1 flex-col animate-in fade-in-0 duration-150 ease-out"
      >
        {view === "board" ? (
          <DndContext
            id={boardId}
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="flex min-h-0 flex-1 items-start gap-4 overflow-x-auto p-1 pb-2">
              {columns.map((column) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  tasks={tasksByColumn.get(column.id) ?? []}
                  profilesById={profilesById}
                  labelsByTask={labelsByTask}
                  onAddTask={handleAddTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <TaskCard
                  task={activeTask}
                  profile={
                    profilesById.get(activeTask.assignee_id ?? "") ?? null
                  }
                  labels={labelsByTask.get(activeTask.id) ?? []}
                  className="rotate-2 shadow-xl ring-1 ring-foreground/10"
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <TaskList
            tasks={listTasks}
            columns={columns}
            profilesById={profilesById}
            labelsByTask={labelsByTask}
            onEditTask={handleEditTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
      </div>

      <TaskFormDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
        boardId={boardId}
        columnId={dialogColumnId}
        task={dialog?.mode === "edit" ? dialog.task : undefined}
        profiles={profiles}
        labels={labels}
        taskLabelIds={taskLabelIds}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        onLabelCreated={handleLabelCreated}
      />
    </div>
  )
}