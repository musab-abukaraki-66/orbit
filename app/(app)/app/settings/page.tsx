import { Settings } from "lucide-react"

import { EmptyState } from "@/components/empty-state"

export default function SettingsPage() {
  return (
    <EmptyState
      icon={Settings}
      title="Workspace settings"
      description="Profile, billing, and workspace preferences will live here."
    />
  )
}
