"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { ProjectFormDialog } from "@/components/projects/project-form-dialog"
import { Button } from "@/components/ui/button"

export function NewProjectButton({
  workspaceId,
  slug,
  members,
  currentUserId,
  autoOpen = false,
  size = "default",
}: {
  workspaceId: string
  slug: string
  members: { id: string; full_name: string | null; email: string | null }[]
  currentUserId: string
  autoOpen?: boolean
  size?: "default" | "sm" | "lg"
}) {
  const [open, setOpen] = React.useState(autoOpen)
  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        <Plus />
        New project
      </Button>
      <ProjectFormDialog mode="create" workspaceId={workspaceId} slug={slug} members={members} currentUserId={currentUserId} open={open} onOpenChange={setOpen} />
    </>
  )
}
