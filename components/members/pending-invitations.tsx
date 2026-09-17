"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Clock, Copy, Send, X } from "lucide-react"

import { resendInvitationEmail, revokeInvitation, type InviteState } from "@/lib/members/actions"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Invitation = { id: string; email: string; role: string; status: string; expires_at: string; created_at: string }

export function PendingInvitations({ slug, invitations, emailConfigured = false }: { slug: string; invitations: Invitation[]; emailConfigured?: boolean }) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [reissued, setReissued] = React.useState<Extract<InviteState, { ok: true }> | null>(null)
  const [copied, setCopied] = React.useState(false)

  if (invitations.length === 0 && !reissued) {
    return <p className="text-sm text-muted-foreground">No pending invitations. Invitation links are shown once when you create them — create a new one if you lost it.</p>
  }

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {reissued ? (
        <div className="flex flex-col gap-2">
          <Alert variant="success">
            New link for <strong>{reissued.email}</strong>.{reissued.emailed ? " Email sent." : " Copy it and send it to them."}
          </Alert>
          {reissued.emailError ? <Alert variant="warning">Email not delivered: {reissued.emailError} Share the link instead.</Alert> : null}
          <div className="flex gap-2">
            <Input readOnly value={reissued.link} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" aria-label="New invitation link" />
            <Button type="button" variant="outline" onClick={() => void copy(reissued.link)} className="shrink-0">
              {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      ) : null}
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {invitations.map((invitation) => {
          const expired = invitation.expires_at < new Date().toISOString()
          return (
            <li key={invitation.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
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
                disabled={busy === invitation.id}
                onClick={async () => {
                  setBusy(invitation.id)
                  setError(null)
                  const result = await resendInvitationEmail(invitation.id, slug)
                  setBusy(null)
                  if (!result?.ok) setError(result?.message ?? "Could not reissue the invitation.")
                  else {
                    setReissued(result)
                    router.refresh()
                  }
                }}
              >
                <Send className="size-3.5" />
                {emailConfigured ? "Resend email" : "New link"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy === invitation.id}
                onClick={async () => {
                  const result = await revokeInvitation(invitation.id, slug)
                  if (!result.ok) setError(result.message ?? "Could not revoke.")
                  else if (reissued?.email === invitation.email) setReissued(null)
                  router.refresh()
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
      <p className="text-xs text-muted-foreground">
        {emailConfigured ? "Resending issues a fresh link and emails it; the old link stops working immediately." : "Lost a link? “New link” issues a fresh one — the old link stops working immediately."}
      </p>
    </div>
  )
}
