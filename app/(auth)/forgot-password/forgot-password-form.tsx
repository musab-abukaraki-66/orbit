"use client"

import Link from "next/link"
import { useActionState, useState } from "react"

import { requestPasswordReset, type ResetRequestState } from "@/lib/auth/actions"
import { isValidEmail } from "@/lib/auth/password"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ForgotPasswordForm({ linkFailed }: { linkFailed: boolean }) {
  const [state, formAction, pending] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    undefined,
  )
  const [clientError, setClientError] = useState<string | null>(null)

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          If an account exists for that email, a password reset link is on its way. Check your inbox
          (and spam folder) — the link expires after a short while.
        </p>
        <Link href="/login" className="text-center text-sm font-medium underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  const error =
    clientError ??
    (state && !state.ok ? state.message : null) ??
    (linkFailed ? "That reset link is invalid or has expired. Request a new one below." : null)

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(event) => {
        const email = String(new FormData(event.currentTarget).get("email") ?? "").trim()
        if (!isValidEmail(email)) {
          event.preventDefault()
          setClientError("Please enter a valid email address.")
          return
        }
        setClientError(null)
      }}
      className="flex flex-col gap-4"
    >
      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
      </div>

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
