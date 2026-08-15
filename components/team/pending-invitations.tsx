"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Mail, X } from "lucide-react"

import { revokeInvitation, type InvitationPayload } from "@/lib/team/actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function daysLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return "expired"
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days === 1) return "expires tomorrow"
  return `expires in ${days} days`
}

export function PendingInvitations({
  invitations,
  canManage,
}: {
  invitations: InvitationPayload[]
  canManage: boolean
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function handleRevoke(id: string) {
    setPendingId(id)
    setError(null)
    const result = await revokeInvitation(id)
    if (!result.ok) {
      setError(result.message ?? "Could not revoke this invitation.")
      setPendingId(null)
      return
    }
    setPendingId(null)
    router.refresh()
  }

  if (invitations.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" />
          Pending invitations
        </CardTitle>
        <CardDescription>
          People who haven&apos;t accepted their invite yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        {invitations.map((invitation) => (
          <div key={invitation.id} className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {invitation.email[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">
                {invitation.email}
              </span>
              <span className="text-xs text-muted-foreground">
                {invitation.invitedBy
                  ? `Invited by ${invitation.invitedBy} · `
                  : ""}
                {daysLeft(invitation.expiresAt)}
              </span>
            </div>
            <Badge variant="secondary" className="capitalize">
              {invitation.role}
            </Badge>
            {canManage ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRevoke(invitation.id)}
                disabled={pendingId === invitation.id}
                aria-label={`Revoke invitation for ${invitation.email}`}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}