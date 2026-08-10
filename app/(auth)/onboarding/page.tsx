import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getFirstTeam, requireUser } from "@/lib/auth/session"
import { OnboardingForm } from "./onboarding-form"

export const metadata: Metadata = {
  title: "Create your team",
}

export default async function OnboardingPage() {
  const user = await requireUser()

  const team = await getFirstTeam(user.id)
  if (team) {
    redirect("/app")
  }

  const firstName = String(user.user_metadata?.full_name ?? user.email ?? "")
    .split(/\s+/)[0]
    .trim()

  return (
    <div className="w-full max-w-md flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your team{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Teams are where Orbit work lives. You can invite teammates after
          you&apos;re set up.
        </p>
      </div>
      <OnboardingForm />
    </div>
  )
}
