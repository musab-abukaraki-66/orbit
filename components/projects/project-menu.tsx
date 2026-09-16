"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { archiveProject, deleteProject } from "@/lib/projects/actions"
import type { ProjectStatus } from "@/lib/projects/meta"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ProjectFormDialog } from "@/components/projects/project-form-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function ProjectMenu({
  slug,
  project,
  members,
  currentUserId,
  canEdit,
  canDelete,
}: {
  slug: string
  project: { id: string; name: string; description: string | null; status: ProjectStatus; lead_id: string | null; target_date: string | null; archived_at: string | null }
  members: { id: string; full_name: string | null; email: string | null }[]
  currentUserId: string
  canEdit: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (!canEdit && !canDelete) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Project actions" />}>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {canEdit ? (
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil />
              Edit project
            </DropdownMenuItem>
          ) : null}
          {canEdit ? (
            <DropdownMenuItem
              onClick={async () => {
                const result = await archiveProject(project.id, slug, !project.archived_at)
                if (!result.ok) setError(result.message ?? "Could not archive.")
                else router.refresh()
              }}
            >
              {project.archived_at ? <ArchiveRestore /> : <Archive />}
              {project.archived_at ? "Restore project" : "Archive project"}
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
                Delete project
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <ProjectFormDialog mode="edit" slug={slug} project={project} members={members} currentUserId={currentUserId} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete project"
        description={`Delete “${project.name}” and all of its tasks, comments and history? This cannot be undone. Consider archiving instead.`}
        confirmLabel="Delete project"
        onConfirm={async () => {
          const result = await deleteProject(project.id, slug)
          return result.ok ? undefined : { ok: false, message: result.message }
        }}
      />
    </>
  )
}
