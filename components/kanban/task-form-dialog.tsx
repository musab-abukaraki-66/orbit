"use client"

import * as React from "react"
import { useActionState } from "react"
import { Check, CircleUserRound } from "lucide-react"

import { createTask, updateTask, type TaskFormState } from "@/lib/tasks/actions"
import type {
  ProfilePayload,
  TaskPayload,
} from "@/lib/tasks/types"
import { PRIORITY_META, DEFAULT_PRIORITY } from "@/components/kanban/priority"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

function getInitials(name: string | null): string {
  if (!name) return "?"
  const result = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
  return result || "?"
}

export function TaskFormDialog({
  open,
  onOpenChange,
  boardId,
  columnId,
  task,
  profiles,
  onCreated,
  onUpdated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
  columnId: string
  task?: TaskPayload
  profiles: ProfilePayload[]
  onCreated: (task: TaskPayload) => void
  onUpdated: (task: TaskPayload) => void
}) {
  const isEditing = Boolean(task)
  const action = isEditing
    ? updateTask.bind(null, task!.id)
    : createTask.bind(null, boardId, columnId)

  const [state, formAction, pending] = useActionState<TaskFormState, FormData>(
    action,
    undefined,
  )
  const submittedRef = React.useRef(false)

  const [priority, setPriority] = React.useState<string>(
    task?.priority ?? DEFAULT_PRIORITY,
  )
  const [assigneeId, setAssigneeId] = React.useState<string | null>(
    task?.assignee_id ?? null,
  )

  // Reset the picker fields each time the dialog opens for a different task
  // (render-phase state adjustment, so no effect cascade is needed).
  const dialogKey = open ? (task?.id ?? "__create__") : null
  const [prevDialogKey, setPrevDialogKey] = React.useState<string | null>(null)
  if (dialogKey !== prevDialogKey) {
    setPrevDialogKey(dialogKey)
    if (dialogKey) {
      setPriority(task?.priority ?? DEFAULT_PRIORITY)
      setAssigneeId(task?.assignee_id ?? null)
    }
  }

  React.useEffect(() => {
    if (submittedRef.current && !pending) {
      submittedRef.current = false
      if (state?.ok && state.task) {
        onOpenChange(false)
        if (isEditing) onUpdated(state.task)
        else onCreated(state.task)
      }
    }
  }, [pending, state, onOpenChange, onCreated, onUpdated, isEditing])

  const selectedPriority = PRIORITY_META[priority as keyof typeof PRIORITY_META] ?? PRIORITY_META[DEFAULT_PRIORITY]
  const SelectedPriorityIcon = selectedPriority.icon
  const selectedAssignee = profiles.find((p) => p.id === assigneeId) ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the task details below."
              : "Tasks live in a column and can be dragged between lanes."}
          </DialogDescription>
        </DialogHeader>
        <form
          action={formAction}
          onSubmit={() => {
            submittedRef.current = true
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              name="title"
              placeholder="e.g. Ship the onboarding flow"
              defaultValue={task?.title ?? ""}
              autoFocus
              required
              maxLength={200}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              name="description"
              placeholder="Add more context for your team…"
              defaultValue={task?.description ?? ""}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <input type="hidden" name="priority" value={priority} />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-between"
                    />
                  }
                >
                  <span className="flex items-center gap-1.5">
                    <SelectedPriorityIcon
                      className={cn("size-3.5", selectedPriority.className)}
                    />
                    {selectedPriority.label}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-40">
                  {Object.entries(PRIORITY_META).map(([value, meta]) => {
                    const Icon = meta.icon
                    return (
                      <DropdownMenuItem
                        key={value}
                        onClick={() => setPriority(value)}
                        className="justify-between"
                      >
                        <span className="flex items-center gap-1.5">
                          <Icon className={cn("size-3.5", meta.className)} />
                          {meta.label}
                        </span>
                        {value === priority ? <Check className="size-3.5" /> : null}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Assignee</Label>
              <input type="hidden" name="assignee_id" value={assigneeId ?? ""} />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-between"
                    />
                  }
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {selectedAssignee ? (
                      <>
                        <Avatar size="sm" className="size-4">
                          <AvatarFallback className="text-[9px]">
                            {getInitials(selectedAssignee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {selectedAssignee.full_name ?? selectedAssignee.email}
                        </span>
                      </>
                    ) : (
                      <>
                        <CircleUserRound className="size-3.5 text-muted-foreground" />
                        Unassigned
                      </>
                    )}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-64 min-w-44 overflow-y-auto">
                  <DropdownMenuItem
                    onClick={() => setAssigneeId(null)}
                    className="justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <CircleUserRound className="size-3.5 text-muted-foreground" />
                      Unassigned
                    </span>
                    {!assigneeId ? <Check className="size-3.5" /> : null}
                  </DropdownMenuItem>
                  {profiles.map((profile) => (
                    <DropdownMenuItem
                      key={profile.id}
                      onClick={() => setAssigneeId(profile.id)}
                      className="justify-between"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Avatar size="sm" className="size-4">
                          <AvatarFallback className="text-[9px]">
                            {getInitials(profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {profile.full_name ?? profile.email}
                        </span>
                      </span>
                      {assigneeId === profile.id ? (
                        <Check className="size-3.5" />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {state?.ok === false ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.message}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending
                ? isEditing
                  ? "Saving…"
                  : "Creating…"
                : isEditing
                  ? "Save changes"
                  : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
