import type { Metadata } from "next"

import { displayName, requireUser } from "@/lib/auth/session"
import { requireWorkspace } from "@/lib/workspaces/context"
import { ProfileForm } from "@/components/settings/profile-form"
import { SignOutButton } from "@/components/sign-out-button"
import { UserAvatar } from "@/components/user-avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Profile" }

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const context = await requireWorkspace(slug)
  const user = await requireUser()
  const name = displayName(user)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <UserAvatar name={name} avatarUrl={user.user_metadata?.avatar_url as string | undefined} className="size-14" fallbackClassName="text-lg" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="text-sm text-muted-foreground">{user.email} · {context.role} of {context.name}</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>How you appear to teammates across every workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm slug={slug} fullName={String(user.user_metadata?.full_name ?? "")} email={user.email ?? ""} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Member since {new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton className="border border-border" />
        </CardContent>
      </Card>
    </div>
  )
}
