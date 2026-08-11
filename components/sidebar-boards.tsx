"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus } from "lucide-react"

import { BoardMenu } from "@/components/board-menu"
import { CreateBoardDialog } from "@/components/create-board-dialog"
import { Button } from "@/components/ui/button"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type BoardItem = {
  id: string
  name: string
}

export function SidebarBoards({
  boards,
  workspaceId,
}: {
  boards: BoardItem[]
  workspaceId: string | null
}) {
  const pathname = usePathname()

  if (!workspaceId) {
    return (
      <p className="px-2 py-1 text-xs text-muted-foreground">
        Create a workspace to get started.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1 group-data-[collapsible=icon]:hidden">
      {boards.length === 0 ? (
        <p className="px-2 py-1 text-xs text-muted-foreground">No boards yet.</p>
      ) : (
        <SidebarMenu>
          {boards.map((board) => {
            const href = `/app/boards/${board.id}`
            const isActive = pathname === href
            return (
              <SidebarMenuItem key={board.id}>
                <SidebarMenuButton
                  render={<Link href={href} />}
                  isActive={isActive}
                  size="sm"
                  className="pr-6"
                >
                  <span className="truncate">{board.name}</span>
                </SidebarMenuButton>
                <BoardMenu
                  boardId={board.id}
                  boardName={board.name}
                  triggerClassName="absolute top-1/2 right-1 -translate-y-1/2 opacity-0 transition-opacity group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                />
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      )}
      <CreateBoardDialog
        workspaceId={workspaceId}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 text-muted-foreground hover:text-foreground"
          >
            <Plus />
            New board
          </Button>
        }
      />
    </div>
  )
}
