"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { createBoard } from "@/lib/boards/actions"
import { Button } from "@/components/ui/button"
import { NameFormDialog } from "@/components/name-form-dialog"

export function CreateBoardDialog({
  workspaceId,
  trigger,
  open,
  onOpenChange,
}: {
  workspaceId: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const controlled = open !== undefined
  const dialogOpen = controlled ? (open as boolean) : internalOpen
  const setDialogOpen = (value: boolean) =>
    controlled ? onOpenChange?.(value) : setInternalOpen(value)

  return (
    <>
      {!controlled ? (
        trigger ? (
          React.cloneElement(
            trigger as React.ReactElement<{ onClick?: () => void }>,
            { onClick: () => setDialogOpen(true) },
          )
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <Plus />
            New board
          </Button>
        )
      ) : null}

      <NameFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Create board"
        description="Boards hold task cards in columns. You can organize tasks into lanes on your board."
        label="Board name"
        placeholder="e.g. Q3 Launch, Sprint 12, Design System"
        submitLabel="Create board"
        pendingLabel="Creating…"
        action={createBoard.bind(null, workspaceId)}
      />
    </>
  )
}
