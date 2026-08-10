import { Users } from "lucide-react"

import { EmptyState } from "@/components/empty-state"

export default function TeamPage() {
  return (
    <EmptyState
      icon={Users}
      title="Invite your team"
      description="Members, roles, and permissions will be managed here."
    />
  )
}
