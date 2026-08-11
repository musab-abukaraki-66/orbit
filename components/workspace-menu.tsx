"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import {
  deleteWorkspace,
  renameWorkspace,
} from "@/lib/workspaces/actions"
import { NameFormDialog } from "@/components/name-form-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function WorkspaceMenu({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string
  workspaceName: string
}) {
  const router = useRouter()
  const [renameOpen, setRenameOpen] = React.useState(false)
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
              aria-label="Workspace actions"
            />
          }
        >
          <span className="sr-only">Workspace actions</span>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <Pencil />
            Rename
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

      <NameFormDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename workspace"
        label="Workspace name"
        initialValue={workspaceName}
        submitLabel="Rename"
        pendingLabel="Renaming…"
        action={renameWorkspace.bind(null, workspaceId)}
        onSuccess={() => router.refresh()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete workspace"
        description="This permanently deletes the workspace and all of its boards. This action cannot be undone."
        confirmLabel="Delete workspace"
        pendingLabel="Deleting…"
        onConfirm={() => deleteWorkspace(workspaceId)}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
