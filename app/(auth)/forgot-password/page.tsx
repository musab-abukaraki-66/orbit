import type { Metadata } from "next"

import { ForgotPasswordForm } from "./forgot-password-form"

export const metadata: Metadata = {
  title: "Reset your password",
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to choose a new password.
        </p>
      </div>
      <ForgotPasswordForm linkFailed={error === "link"} />
    </div>
  )
}
