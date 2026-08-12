import { redirect } from "next/navigation"
import { Boxes, Kanban, Plus } from "lucide-react"

import { requireUser } from "@/lib/auth/session"
import { getWorkspaceContext } from "@/lib/workspaces/data"
import { getTaskCountsByBoard } from "@/lib/tasks/data"
import { BoardCard } from "@/components/board-card"
import { CreateBoardDialog } from "@/components/create-board-dialog"
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default async function BoardsPage() {
  const user = await requireUser()
  const context = await getWorkspaceContext(user.id)
  if (!context) redirect("/onboarding")

  const activeWorkspace = context.activeWorkspace
  const boards = context.boards

  const taskCounts = await getTaskCountsByBoard(
    boards.map((board) => board.id),
  )

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Boards</h1>
        <p className="text-sm text-muted-foreground">
          Boards in{" "}
          <span className="font-medium text-foreground">
            {activeWorkspace?.name ?? "your workspace"}
          </span>
          . Boards group tasks into columns your team can work through.
        </p>
      </div>

      {!activeWorkspace ? (
        <Card className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Boxes className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Create a workspace first</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Boards live inside workspaces. Create a workspace to get started.
            </p>
          </div>
          <CreateWorkspaceDialog />
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {boards.length === 0
                ? "No boards yet."
                : `${boards.length} board${boards.length === 1 ? "" : "s"}.`}
            </p>
            <CreateBoardDialog workspaceId={activeWorkspace.id} />
          </div>

          {boards.length === 0 ? (
            <Card className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Kanban className="size-6 text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">No boards yet</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Create a board to organize tasks into lanes you control.
                </p>
              </div>
              <CreateBoardDialog
                workspaceId={activeWorkspace.id}
                trigger={
                  <Button>
                    Create board
                    <Plus className="size-4" />
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {boards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  taskCount={taskCounts.get(board.id) ?? 0}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
