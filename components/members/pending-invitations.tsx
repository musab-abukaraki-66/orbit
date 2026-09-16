"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Clock, X } from "lucide-react"

import { revokeInvitation } from "@/lib/members/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Invitation = { id: string; email: string; role: string; status: string; expires_at: string; created_at: string }

export function PendingInvitations({ slug, invitations }: { slug: string; invitations: Invitation[] }) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)

  if (invitations.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending invitations. Invitation links are shown once when you create them — create a new one if you lost it.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {invitations.map((invitation) => {
          const expired = invitation.expires_at < new Date().toISOString()
          return (
            <li key={invitation.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{invitation.email}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {expired ? "Expired" : `Expires ${new Date(invitation.expires_at).toLocaleDateString()}`}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">{invitation.role}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const result = await revokeInvitation(invitation.id, slug)
                  if (!result.ok) setError(result.message ?? "Could not revoke.")
                  else router.refresh()
                }}
              >
                <X className="size-3.5" />
                Revoke
              </Button>
            </li>
          )
        })}
      </ul>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <p className="text-xs text-muted-foreground">Lost a link? Revoke it and create a new invitation for the same email — the old link stops working immediately.</p>
    </div>
  )
}
