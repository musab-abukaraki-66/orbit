"use client"

import { memo, useMemo } from "react"
import { CalendarDays, Plus, SquareKanban } from "lucide-react"

import type {
  ColumnPayload,
  LabelPayload,
  ProfilePayload,
  TaskPayload,
} from "@/lib/tasks/types"
import { getPriorityMeta } from "@/components/kanban/priority"
import { getColumnDotClass } from "@/components/kanban/column-style"
import { LabelChips } from "@/components/kanban/label-chips"
import { TaskActionsMenu } from "@/components/kanban/task-actions-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function getInitials(name: string | null): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const result = parts.map((part) => part[0]?.toUpperCase() ?? "").join("")
  return result || "?"
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// Rendered only when the client has switched to the List view, so using the
// local clock is safe here (no SSR/hydration ambiguity).
function DueDate({ value }: { value: string }) {
  const due = new Date(`${value}T00:00:00`)
  if (Number.isNaN(due.getTime())) return <span>{value}</span>
  const label = due.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
  const today = startOfDay(new Date()).getTime()
  const dueDay = startOfDay(due).getTime()
  if (dueDay < today) {
    return (
      <span className="flex items-center gap-1 text-destructive">
        <CalendarDays className="size-3.5" />
        {label}
      </span>
    )
  }
  if (dueDay === today) {
    return (
      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
        <CalendarDays className="size-3.5" />
        Today
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <CalendarDays className="size-3.5" />
      {label}
    </span>
  )
}

export const TaskList = memo(function TaskList({
  tasks,
  columns,
  profilesById,
  labelsByTask,
  onEditTask,
  onAddTask,
  onDeleteTask,
}: {
  tasks: TaskPayload[]
  columns: ColumnPayload[]
  profilesById: Map<string, ProfilePayload>
  labelsByTask: ReadonlyMap<string, LabelPayload[]>
  onEditTask: (task: TaskPayload) => void
  onAddTask: (columnId: string) => void
  onDeleteTask: (taskId: string) => void
}) {
  const columnById = useMemo(
    () => new Map<string, ColumnPayload>(columns.map((column) => [column.id, column])),
    [columns],
  )

  if (tasks.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-dashed">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <SquareKanban className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No tasks yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create a task and it will show up in the list view alongside the
            board.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddTask(columns[0]?.id ?? "")}
          >
            <Plus className="size-3.5" />
            New task
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {tasks.length} task{tasks.length === 1 ? "" : "s"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => onAddTask(columns[0]?.id ?? "")}
        >
          <Plus className="size-3.5" />
          New task
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                Title
              </th>
              <th className="w-32 px-3 py-2 text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="w-24 px-3 py-2 text-xs font-medium text-muted-foreground">
                Priority
              </th>
              <th className="w-40 px-3 py-2 text-xs font-medium text-muted-foreground">
                Assignee
              </th>
              <th className="w-48 px-3 py-2 text-xs font-medium text-muted-foreground">
                Labels
              </th>
              <th className="w-28 px-3 py-2 text-xs font-medium text-muted-foreground">
                Due
              </th>
              <th className="w-10" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const column = columnById.get(task.column_id)
              const priority = getPriorityMeta(task.priority)
              const PriorityIcon = priority.icon
              const profile =
                profilesById.get(task.assignee_id ?? "") ?? null
              const labels = labelsByTask.get(task.id) ?? []
              return (
                <tr
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onEditTask(task)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      onEditTask(task)
                    }
                  }}
                  className="group cursor-pointer border-b transition-colors focus-visible:bg-muted/60 focus-visible:outline-none hover:bg-muted/50"
                >
                  <td className="max-w-[18rem] px-3 py-2">
                    <div className="truncate font-medium text-card-foreground">
                      {task.title}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 rounded-full",
                          getColumnDotClass(column?.name ?? ""),
                        )}
                      />
                      <span className="truncate">{column?.name ?? "Unknown"}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <PriorityIcon className={cn("size-3.5", priority.className)} />
                      <span className="text-muted-foreground">
                        {priority.label}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {profile ? (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Avatar size="sm" className="size-5">
                          <AvatarFallback className="text-[10px]">
                            {getInitials(profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-muted-foreground">
                          {profile.full_name ?? profile.email}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <LabelChips labels={labels} max={2} />
                  </td>
                  <td className="px-3 py-2">
                    {task.due_date ? (
                      <DueDate value={task.due_date} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="flex justify-end opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <TaskActionsMenu
                        taskId={task.id}
                        onEdit={() => onEditTask(task)}
                        onDeleted={() => onDeleteTask(task.id)}
                      />
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
})