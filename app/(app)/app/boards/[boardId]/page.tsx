import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Columns3 } from "lucide-react"

import { requireUser } from "@/lib/auth/session"
import { getBoardById, getColumnsForBoard } from "@/lib/boards/data"
import { getWorkspaceById } from "@/lib/workspaces/data"
import { BoardMenu } from "@/components/board-menu"

type BoardPageProps = {
  params: Promise<{ boardId: string }>
}

export async function generateMetadata({
  params,
}: BoardPageProps): Promise<Metadata> {
  const { boardId } = await params
  const board = await getBoardById(boardId)
  return { title: board?.name ?? "Board" }
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { boardId } = await params
  await requireUser()

  const board = await getBoardById(boardId)
  if (!board) notFound()

  const workspace = await getWorkspaceById(board.workspace_id)
  const columns = await getColumnsForBoard(boardId)

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/app/boards"
            aria-label="Back to boards"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {board.name}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {workspace?.name ?? "Workspace"} · Board
            </p>
          </div>
        </div>
        <BoardMenu
          boardId={board.id}
          boardName={board.name}
          redirectToOnDelete="/app/boards"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-dashed">
        {columns.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Columns3 className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">This board is ready for columns</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Kanban columns are coming in the next milestone. You&apos;ll be
                able to track tasks across lanes and drag cards between them.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 gap-3 overflow-x-auto p-3">
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex w-64 shrink-0 flex-col gap-3 rounded-lg bg-muted/50 p-3"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {column.name}
                </span>
                <p className="text-sm text-muted-foreground/70">
                  Tasks will appear here.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
