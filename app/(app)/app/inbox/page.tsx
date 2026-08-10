import { Inbox } from "lucide-react"

import { EmptyState } from "@/components/empty-state"

export default function InboxPage() {
  return (
    <EmptyState
      icon={Inbox}
      title="Inbox is quiet"
      description="Notifications for mentions, assignments, and board activity will land here."
    />
  )
}
