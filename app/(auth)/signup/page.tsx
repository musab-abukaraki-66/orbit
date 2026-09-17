import type { Metadata } from "next"

import { SignupForm } from "./signup-form"

export const metadata: Metadata = {
  title: "Create your account",
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Create a workspace, invite your team and see who&apos;s working on what.
        </p>
      </div>
      <SignupForm next={next} />
    </div>
  )
}
