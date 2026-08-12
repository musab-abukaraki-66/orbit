"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { switchWorkspace } from "@/lib/workspaces/actions"
import { cn } from "@/lib/utils"
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type WorkspaceItem = {
  id: string
  name: string
}

export function WorkspacePicker({
  workspaces,
  activeWorkspaceId,
  className,
}: {
  workspaces: WorkspaceItem[]
  activeWorkspaceId: string | null
  className?: string
}) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = React.useState(false)
  const active =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0]

  async function handleSwitch(workspaceId: string) {
    const result = await switchWorkspace(workspaceId)
    if (result.ok) {
      router.refresh()
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Switch workspace"
              className={cn(
                "flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-sm font-medium outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
                className,
              )}
            />
          }
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {active?.name ?? "Select workspace"}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          </DropdownMenuGroup>
          {workspaces.length > 0 ? (
            workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleSwitch(workspace.id)}
              >
                <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                {workspace.id === activeWorkspaceId ? (
                  <Check className="size-4 text-muted-foreground" />
                ) : null}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>No workspaces yet</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus />
            New workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
