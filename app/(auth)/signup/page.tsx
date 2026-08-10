import type { Metadata } from "next"

import { SignupForm } from "./signup-form"

export const metadata: Metadata = {
  title: "Create your account",
}

export default function SignupPage() {
  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Start a team and get your first board up in minutes.
        </p>
      </div>
      <SignupForm />
    </div>
  )
}
