import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { firstNameOf, requireUser } from "@/lib/auth/session"
import { getUserWorkspaces } from "@/lib/workspaces/context"
import { OnboardingForm } from "./onboarding-form"

export const metadata: Metadata = { title: "Create your workspace" }

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const user = await requireUser()
  const { new: isNew } = await searchParams
  const workspaces = await getUserWorkspaces()
  if (workspaces.length > 0 && isNew !== "1") redirect(`/w/${workspaces[0].slug}`)

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {workspaces.length > 0 ? "Create another workspace" : `Welcome, ${firstNameOf(user)}. Let's set up your workspace.`}
        </h1>
        <p className="text-sm text-muted-foreground">
          A workspace is your team&apos;s home — projects, tasks and people live inside it. Name it after your company or team.
        </p>
      </div>
      <OnboardingForm hasWorkspaces={workspaces.length > 0} backHref={workspaces[0] ? `/w/${workspaces[0].slug}` : null} />
    </div>
  )
}
