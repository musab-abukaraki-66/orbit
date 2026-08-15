"use client"

import * as React from "react"
import { useActionState } from "react"
import { Check, CircleUserRound, Plus, X } from "lucide-react"

import {
  createLabel,
  createTask,
  updateTask,
  type TaskFormState,
} from "@/lib/tasks/actions"
import type {
  LabelPayload,
  ProfilePayload,
  TaskLabelIdsByTask,
  TaskPayload,
} from "@/lib/tasks/types"
import { PRIORITY_META, DEFAULT_PRIORITY } from "@/components/kanban/priority"
import { LABEL_COLORS, getLabelStyle } from "@/components/kanban/label-style"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
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

const DEFAULT_LABEL_COLOR = "violet"

export function TaskFormDialog({
  open,
  onOpenChange,
  boardId,
  columnId,
  task,
  profiles,
  labels,
  taskLabelIds,
  onCreated,
  onUpdated,
  onLabelCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
  columnId: string
  task?: TaskPayload
  profiles: ProfilePayload[]
  labels: LabelPayload[]
  taskLabelIds: TaskLabelIdsByTask
  onCreated: (task: TaskPayload, labelIds: string[]) => void
  onUpdated: (task: TaskPayload, labelIds: string[]) => void
  onLabelCreated: (label: LabelPayload) => void
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
  const [title, setTitle] = React.useState<string>(task?.title ?? "")
  const [description, setDescription] = React.useState<string>(
    task?.description ?? "",
  )
  const [dueDate, setDueDate] = React.useState<string>(task?.due_date ?? "")
  const [selectedLabelIds, setSelectedLabelIds] = React.useState<string[]>(
    task ? (taskLabelIds[task.id] ?? []) : [],
  )
  const [newLabelOpen, setNewLabelOpen] = React.useState(false)
  const [newLabelName, setNewLabelName] = React.useState("")
  const [newLabelColor, setNewLabelColor] = React.useState(DEFAULT_LABEL_COLOR)
  const [newLabelError, setNewLabelError] = React.useState<string | null>(null)
  const [creatingLabel, setCreatingLabel] = React.useState(false)

  // Reset the picker fields each time the panel opens for a different task
  // (render-phase state adjustment, so no effect cascade is needed).
  const dialogKey = open ? (task?.id ?? "__create__") : null
  const [prevDialogKey, setPrevDialogKey] = React.useState<string | null>(null)
  if (dialogKey !== prevDialogKey) {
    setPrevDialogKey(dialogKey)
    if (dialogKey) {
      setPriority(task?.priority ?? DEFAULT_PRIORITY)
      setAssigneeId(task?.assignee_id ?? null)
      setTitle(task?.title ?? "")
      setDescription(task?.description ?? "")
      setDueDate(task?.due_date ?? "")
      setSelectedLabelIds(
        task ? (taskLabelIds[task.id] ?? []) : [],
      )
      setNewLabelOpen(false)
      setNewLabelName("")
      setNewLabelColor(DEFAULT_LABEL_COLOR)
      setNewLabelError(null)
    }
  }

  React.useEffect(() => {
    if (submittedRef.current && !pending) {
      submittedRef.current = false
      if (state?.ok && state.task) {
        onOpenChange(false)
        if (isEditing) onUpdated(state.task, state.label_ids ?? [])
        else onCreated(state.task, state.label_ids ?? [])
      }
    }
  }, [pending, state, onOpenChange, onCreated, onUpdated, isEditing])

  const selectedPriority =
    PRIORITY_META[priority as keyof typeof PRIORITY_META] ??
    PRIORITY_META[DEFAULT_PRIORITY]
  const SelectedPriorityIcon = selectedPriority.icon
  const selectedAssignee = profiles.find((profile) => profile.id === assigneeId) ?? null
  const selectedLabels = labels.filter((label) =>
    selectedLabelIds.includes(label.id),
  )
  const addableLabels = labels.filter(
    (label) => !selectedLabelIds.includes(label.id),
  )

  function toggleLabel(labelId: string) {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId],
    )
  }

  async function handleCreateLabel() {
    const trimmed = newLabelName.trim()
    if (!trimmed || creatingLabel) return
    setCreatingLabel(true)
    setNewLabelError(null)
    const result = await createLabel(boardId, trimmed, newLabelColor)
    setCreatingLabel(false)
    if (!result?.ok || !result.label) {
      setNewLabelError(result?.message ?? "Couldn't create the label.")
      return
    }
    const created = result.label
    onLabelCreated(created)
    setSelectedLabelIds((prev) =>
      prev.includes(created.id) ? prev : [...prev, created.id],
    )
    setNewLabelName("")
    setNewLabelOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader className="pr-8">
          <SheetTitle>{isEditing ? "Edit task" : "New task"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the task details below."
              : "Tasks live in a column and can be dragged between lanes."}
          </SheetDescription>
        </SheetHeader>
        <form
          action={formAction}
          onSubmit={() => {
            submittedRef.current = true
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                name="title"
                placeholder="e.g. Ship the onboarding flow"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
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
                value={description}
                onChange={(event) => setDescription(event.target.value)}
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
                          {value === priority ? (
                            <Check className="size-3.5" />
                          ) : null}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Assignee</Label>
                <input
                  type="hidden"
                  name="assignee_id"
                  value={assigneeId ?? ""}
                />
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
                            {selectedAssignee.full_name ??
                              selectedAssignee.email}
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
                  <DropdownMenuContent
                    align="start"
                    className="max-h-64 min-w-44 overflow-y-auto"
                  >
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-due-date">Due date</Label>
              <div className="flex items-center gap-2">
                <input type="hidden" name="due_date" value={dueDate} />
                <Input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="min-w-0 flex-1"
                />
                {dueDate ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => setDueDate("")}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Labels</Label>
              <input type="hidden" name="labels" value={selectedLabelIds.join(",")} />
              {selectedLabels.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedLabels.map((label) => (
                    <span
                      key={label.id}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-1.5 text-xs font-medium",
                        getLabelStyle(label.color).chip,
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-1.5 rounded-full",
                          getLabelStyle(label.color).swatch,
                        )}
                      />
                      {label.name}
                      <button
                        type="button"
                        aria-label={`Remove label ${label.name}`}
                        onClick={() => toggleLabel(label.id)}
                        className="rounded-full p-0.5 outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No labels yet.
                </p>
              )}

              <div className="flex items-center gap-2">
                {labels.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-muted-foreground"
                      />
                    }
                  >
                    <Plus className="size-3.5" />
                    Add label
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="max-h-64 min-w-48 overflow-y-auto"
                  >
                    {addableLabels.length === 0 ? (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">
                        All labels are already applied.
                      </p>
                    ) : null}
                    {addableLabels.map((label) => (
                      <DropdownMenuItem
                        key={label.id}
                        onClick={() => toggleLabel(label.id)}
                        className="justify-between"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            aria-hidden
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              getLabelStyle(label.color).swatch,
                            )}
                          />
                          <span className="truncate">{label.name}</span>
                        </span>
                        {selectedLabelIds.includes(label.id) ? (
                          <Check className="size-3.5" />
                        ) : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                ) : null}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setNewLabelOpen((prev) => !prev)}
                >
                  <Plus className="size-3.5" />
                  New label
                </Button>
              </div>

              {newLabelOpen ? (
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-2.5">
                  <Input
                    value={newLabelName}
                    onChange={(event) => setNewLabelName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        void handleCreateLabel()
                      }
                    }}
                    placeholder="Label name"
                    aria-label="New label name"
                    maxLength={40}
                  />
                  <div className="flex items-center gap-1.5">
                    {LABEL_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Use ${color} color`}
                        onClick={() => setNewLabelColor(color)}
                        className={cn(
                          "size-5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          color === newLabelColor &&
                            "ring-2 ring-offset-2 ring-ring",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "block size-5 rounded-full",
                            getLabelStyle(color).swatch,
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  {newLabelError ? (
                    <p
                      role="alert"
                      className="text-xs text-destructive"
                    >
                      {newLabelError}
                    </p>
                  ) : null}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewLabelOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newLabelName.trim() || creatingLabel}
                      onClick={() => void handleCreateLabel()}
                    >
                      {creatingLabel ? "Creating…" : "Create label"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {state?.ok === false ? (
            <p
              role="alert"
              className="mx-4 mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.message}
            </p>
          ) : null}

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? isEditing
                  ? "Saving…"
                  : "Creating…"
                : isEditing
                  ? "Save changes"
                  : "Create task"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}