"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Plus } from "lucide-react"

import type {
  ColumnPayload,
  ProfilePayload,
  TaskPayload,
} from "@/lib/tasks/types"
import { getColumnDotClass } from "@/components/kanban/column-style"
import { SortableTaskCard } from "@/components/kanban/sortable-task-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function BoardColumn({
  column,
  tasks,
  profilesById,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: {
  column: ColumnPayload
  tasks: TaskPayload[]
  profilesById: Map<string, ProfilePayload>
  onAddTask: (columnId: string) => void
  onEditTask: (task: TaskPayload) => void
  onDeleteTask: (taskId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex max-h-full w-64 shrink-0 flex-col rounded-xl bg-muted/40">
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
        <span
          aria-hidden
          className={cn("size-2 shrink-0 rounded-full", getColumnDotClass(column.name))}
        />
        <h2 className="truncate text-[13px] font-medium">{column.name}</h2>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-10 flex-1 flex-col gap-2 overflow-y-auto rounded-lg p-2 transition-colors",
            isOver && "bg-muted/60",
          )}
        >
          {tasks.length === 0 ? (
            <div className="flex min-h-16 flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground/70">
              Drop tasks here
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                profile={profilesById.get(task.assignee_id ?? "") ?? null}
                onEdit={() => onEditTask(task)}
                onDeleted={() => onDeleteTask(task.id)}
              />
            ))
          )}
        </div>
      </SortableContext>

      <div className="p-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => onAddTask(column.id)}
        >
          <Plus className="size-3.5" />
          New task
        </Button>
      </div>
    </div>
  )
}
