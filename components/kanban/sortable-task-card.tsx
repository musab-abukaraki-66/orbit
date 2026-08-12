"use client"

import { memo } from "react"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import type { ProfilePayload, TaskPayload } from "@/lib/tasks/types"
import { TaskCard } from "@/components/kanban/task-card"
import { TaskActionsMenu } from "@/components/kanban/task-actions-menu"
import { cn } from "@/lib/utils"

export const SortableTaskCard = memo(function SortableTaskCard({
  task,
  profile,
  isActive,
  onEdit,
  onDeleted,
}: {
  task: TaskPayload
  profile: ProfilePayload | null
  isActive?: boolean
  onEdit: () => void
  onDeleted: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      aria-roledescription="Task. Press Space to pick up, arrow keys to move, Space to drop."
      className={cn(
        "cursor-grab touch-none rounded-lg outline-none select-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <TaskCard
        task={task}
        profile={profile}
        className={cn(isActive && "ring-1 ring-ring/40 shadow-md")}
        actions={
          <TaskActionsMenu
            taskId={task.id}
            onEdit={onEdit}
            onDeleted={onDeleted}
            className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover/card:opacity-100"
          />
        }
      />
    </div>
  )
})
