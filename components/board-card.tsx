import Link from "next/link"
import { Kanban } from "lucide-react"

import { BoardMenu } from "@/components/board-menu"
import { Card, CardContent } from "@/components/ui/card"

type BoardCardData = {
  id: string
  name: string
}

export function BoardCard({ board }: { board: BoardCardData }) {
  return (
    <Card size="sm" className="transition-colors hover:ring-foreground/25">
      <CardContent className="flex items-center gap-3">
        <Link
          href={`/app/boards/${board.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Kanban className="size-4 text-muted-foreground" />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{board.name}</span>
            <span className="text-xs text-muted-foreground">No tasks yet</span>
          </div>
        </Link>
        <BoardMenu boardId={board.id} boardName={board.name} />
      </CardContent>
    </Card>
  )
}
