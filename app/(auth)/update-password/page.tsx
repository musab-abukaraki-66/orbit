import type { Metadata } from "next"
import Link from "next/link"

import { hasRecoverySession } from "@/lib/auth/recovery"
import { Button } from "@/components/ui/button"

import { UpdatePasswordForm } from "./update-password-form"

export const metadata: Metadata = {
  title: "Choose a new password",
}

export default async function UpdatePasswordPage() {
  const recovery = await hasRecoverySession()

  if (!recovery) {
    return (
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">This link isn&apos;t valid</h1>
          <p className="text-sm text-muted-foreground">
            Password reset links only work once and expire after a short while. Request a new one and
            open it in this browser.
          </p>
        </div>
        <Button size="lg" className="w-full" render={<Link href="/forgot-password" />}>
          Request a new link
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          At least 6 characters, with at least one letter and one number.
        </p>
      </div>
      <UpdatePasswordForm />
    </div>
  )
}
