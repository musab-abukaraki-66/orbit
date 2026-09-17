import type { Metadata } from "next"
import Link from "next/link"
import { Mail, ShieldAlert, Users } from "lucide-react"

import { switchAccount } from "@/lib/auth/actions"
import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { AcceptInvitationButton } from "@/components/members/accept-invitation-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "You're invited" }

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const user = await getCurrentUser()
  const supabase = await createClient()
  const { data } = await supabase.rpc("get_invitation", { p_token: token })
  const invite = data?.[0] ?? null
  const inviteUrl = `/invite/${token}`

  if (!invite) {
    return (
      <Shell icon={ShieldAlert} title="This invitation isn't valid" description="The link may be incomplete, or the invitation was revoked. Ask the person who invited you for a new link.">
        <Button variant="outline" render={<Link href="/app" />}>Go to Orbit</Button>
      </Shell>
    )
  }

  if (invite.status !== "pending") {
    const copy = invite.status === "accepted" ? "This invitation has already been used." : invite.status === "expired" ? "This invitation has expired." : "This invitation was revoked."
    return (
      <Shell icon={ShieldAlert} title={copy} description={`Ask ${invite.inviter_name ?? "the workspace admin"} to send you a fresh invitation to ${invite.workspace_name}.`}>
        <Button variant="outline" render={<Link href="/app" />}>Go to Orbit</Button>
      </Shell>
    )
  }

  if (!user) {
    return (
      <Shell icon={Users} title={`Join ${invite.workspace_name} on Orbit`} description={`${invite.inviter_name ?? "A teammate"} invited ${invite.email_masked} to join as ${invite.role === "admin" ? "an admin" : "a member"}. Create an account with that email, or sign in if you already have one.`}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" render={<Link href={`/signup?next=${encodeURIComponent(inviteUrl)}`} />}>Create account</Button>
          <Button size="lg" variant="outline" render={<Link href={`/login?next=${encodeURIComponent(inviteUrl)}`} />}>I already have an account</Button>
        </div>
      </Shell>
    )
  }

  if (!invite.email_matches) {
    return (
      <Shell icon={Mail} title="This invitation is for a different email" description={`It was sent to ${invite.email_masked}, but you're signed in as ${user.email}. Sign in with the invited address, or ask for a new invitation to this one.`}>
        <form action={switchAccount}>
          <input type="hidden" name="next" value={inviteUrl} />
          <Button type="submit" variant="outline">Switch account</Button>
        </form>
      </Shell>
    )
  }

  return (
    <Shell icon={Users} title={`Join ${invite.workspace_name}`} description={`${invite.inviter_name ?? "A teammate"} invited you to join as ${invite.role === "admin" ? "an admin" : "a member"}. You'll see the team's projects, tasks and activity right away.`}>
      <AcceptInvitationButton token={token} />
    </Shell>
  )
}

function Shell({ icon: Icon, title, description, children }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-brand/15 text-brand">
          <Icon className="size-6" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">{children}</CardContent>
    </Card>
  )
}
