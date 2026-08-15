import type { Metadata } from "next"

import { getActiveTeam, requireUser } from "@/lib/auth/session"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SignOutButton } from "@/components/sign-out-button"

export const metadata: Metadata = {
  title: "Profile",
}

function initialsFor(name: string, email?: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  const first = parts[0]?.[0] ?? email?.[0] ?? "?"
  return first.toUpperCase()
}

export default async function ProfilePage() {
  const user = await requireUser()
  const team = await getActiveTeam(user.id)

  const fullName = String(user.user_metadata?.full_name ?? "").trim()
  const email = user.email ?? ""
  const displayName = fullName || email
  const memberSince = new Date(user.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your account details.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarFallback className="text-base font-medium">
                {initialsFor(displayName, email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <CardTitle>{displayName}</CardTitle>
              <CardDescription>{email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Team</dt>
              <dd className="font-medium">{team?.name ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Member since</dt>
              <dd className="font-medium">{memberSince}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Account type</dt>
              <dd className="font-medium">Free</dd>
            </div>
          </dl>

          <div className="mt-2 border-t pt-4">
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
