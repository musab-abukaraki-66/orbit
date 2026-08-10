import { Kanban } from "lucide-react"

import { EmptyState } from "@/components/empty-state"

export default function BoardsPage() {
  return (
    <EmptyState
      icon={Kanban}
      title="No boards yet"
      description="Create a board to organize tasks into lanes and track progress."
    />
  )
}
