"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { deleteBoard, renameBoard } from "@/lib/boards/actions"
import { NameFormDialog } from "@/components/name-form-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function BoardMenu({
  boardId,
  boardName,
  onDeleted,
  triggerClassName,
  redirectToOnDelete,
}: {
  boardId: string
  boardName: string
  onDeleted?: () => void
  triggerClassName?: string
  redirectToOnDelete?: string
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
              aria-label="Board actions"
              className={triggerClassName}
            />
          }
        >
          <span className="sr-only">Board actions</span>
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
        title="Rename board"
        label="Board name"
        initialValue={boardName}
        submitLabel="Rename"
        pendingLabel="Renaming…"
        action={renameBoard.bind(null, boardId)}
        onSuccess={() => router.refresh()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete board"
        description="This permanently deletes the board and its columns. This action cannot be undone."
        confirmLabel="Delete board"
        pendingLabel="Deleting…"
        onConfirm={() => deleteBoard(boardId)}
        onSuccess={() => {
          if (redirectToOnDelete) {
            router.push(redirectToOnDelete)
          }
          router.refresh()
          onDeleted?.()
        }}
      />
    </>
  )
}
