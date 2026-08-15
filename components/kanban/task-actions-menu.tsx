"use client"

import * as React from "react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { deleteTask } from "@/lib/tasks/actions"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function TaskActionsMenu({
  taskId,
  onEdit,
  onDeleted,
  className,
}: {
  taskId: string
  onEdit: () => void
  onDeleted: () => void
  className?: string
}) {
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Task actions"
              className={cn("size-6 rounded-md", className)}
            />
          }
        >
          <span className="sr-only">Task actions</span>
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-36">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete task"
        description="This permanently deletes the task. This action cannot be undone."
        confirmLabel="Delete task"
        pendingLabel="Deleting…"
        onConfirm={() => deleteTask(taskId)}
        onSuccess={onDeleted}
      />
    </>
  )
}
