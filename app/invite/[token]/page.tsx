import type { Metadata } from "next"
import Link from "next/link"
import {
  CheckCircle2,
  Clock,
  MailX,
  UserRoundCheck,
  XCircle,
} from "lucide-react"

import { getCurrentUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { AcceptInvitationButton } from "@/components/team/accept-invitation"
import { SignOutButton } from "@/components/sign-out-button"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Join a team",
}

type InviteInfo = {
  team_id: string
  team_name: string
  email: string
  role: string
  status: string
  expires_at: string
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const user = await getCurrentUser()

  const supabase = await createClient()
  const { data } = await supabase.rpc("get_invitation", { p_token: token })
  const invite = (data as InviteInfo[] | null)?.[0] ?? null

  const isExpired = invite
    ? isPast(new Date(invite.expires_at).getTime())
    : false

  let state:
    | "invalid"
    | "expired"
    | "closed"
    | "logged-out"
    | "mismatch"
    | "ready" = "invalid"

  if (invite) {
    if (isExpired || invite.status === "expired") {
      state = "expired"
    } else if (invite.status === "accepted" || invite.status === "revoked") {
      state = "closed"
    } else if (!user) {
      state = "logged-out"
    } else if (
      invite.email.toLowerCase() !== (user.email ?? "").trim().toLowerCase()
    ) {
      state = "mismatch"
    } else {
      state = "ready"
    }
  }

  const nextHref = `/invite/${token}`
  const roleLabel = invite
    ? invite.role === "admin"
      ? "an admin"
      : "a member"
    : "a member"

  return (
    <div className="w-full max-w-md flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {state === "ready" ? (
              <UserRoundCheck className="size-5 text-brand" />
            ) : null}
            {state === "ready"
              ? `Join ${invite!.team_name}`
              : state === "logged-out"
                ? "You're invited to join a team"
                : "Invitation"}
          </CardTitle>
          {state === "ready" ? (
            <CardDescription>
              You&apos;ll join as {roleLabel} on the invitation.
            </CardDescription>
          ) : state === "logged-out" ? (
            <CardDescription>
              {invite!.team_name} has invited you to Orbit. Sign in or create an
              account to join.
            </CardDescription>
          ) : null}
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {state === "invalid" ? (
            <InlineNotice
              icon={<XCircle className="size-4" />}
              text="This invitation link is invalid. It may have been mistyped."
            />
          ) : null}

          {state === "expired" ? (
            <InlineNotice
              icon={<Clock className="size-4" />}
              text="This invitation has expired. Ask someone on the team to send you a new one."
            />
          ) : null}

          {state === "closed" ? (
            <InlineNotice
              icon={<CheckCircle2 className="size-4" />}
              text="This invitation has already been used. If you think this is an error, ask the team owner."
            />
          ) : null}

          {state === "logged-out" ? (
            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                render={<Link href={`/login?next=${encodeURIComponent(nextHref)}`} />}
              >
                Sign in
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link href={`/signup?next=${encodeURIComponent(nextHref)}`} />}
              >
                Create an account
              </Button>
            </div>
          ) : null}

          {state === "mismatch" ? (
            <div className="flex flex-col gap-3">
              <InlineNotice
                icon={<MailX className="size-4" />}
                text={`This invitation was sent to ${invite!.email}. You're signed in as ${user!.email}.`}
              />
              <p className="text-sm text-muted-foreground">
                Sign out and sign in with the account the invitation was sent
                to.
              </p>
              <SignOutButton label="Sign out and switch account" />
            </div>
          ) : null}

          {state === "ready" ? (
            <AcceptInvitationButton token={token} />
          ) : null}
        </CardContent>

        {state === "logged-out" || state === "mismatch" ? (
          <CardFooter className="flex justify-center border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/" />}
            >
              Back to Orbit
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  )
}

function InlineNotice({
  icon,
  text,
}: {
  icon: React.ReactNode
  text: string
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-muted bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground [&_svg]:mt-0.5 [&_svg]:size-4">
      {icon}
      <span>{text}</span>
    </div>
  )
}

function isPast(timestamp: number): boolean {
  return timestamp < Date.now()
}