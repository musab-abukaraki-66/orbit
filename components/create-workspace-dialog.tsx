"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { createWorkspace } from "@/lib/workspaces/actions"
import { Button } from "@/components/ui/button"
import { NameFormDialog } from "@/components/name-form-dialog"

export function CreateWorkspaceDialog({
  trigger,
  open,
  onOpenChange,
}: {
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
            New workspace
          </Button>
        )
      ) : null}

      <NameFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Create workspace"
        description="Workspaces group related boards, so your team can organize work by product or project."
        label="Workspace name"
        placeholder="e.g. Engineering, Marketing, Design"
        submitLabel="Create workspace"
        pendingLabel="Creating…"
        action={createWorkspace}
      />
    </>
  )
}
