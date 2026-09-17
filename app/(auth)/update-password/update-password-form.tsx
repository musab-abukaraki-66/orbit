"use client"

import { useActionState, useState } from "react"

import { updatePassword, type AuthFormState } from "@/lib/auth/actions"
import { validateNewPassword } from "@/lib/auth/password"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(updatePassword, undefined)
  const [clientError, setClientError] = useState<string | null>(null)
  const error = clientError ?? state?.message

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget)
        const problem = validateNewPassword(String(data.get("password") ?? ""), String(data.get("confirm") ?? ""))
        if (problem) {
          event.preventDefault()
          setClientError(problem)
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
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          New password
        </label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className="text-sm font-medium text-foreground">
          Confirm new password
        </label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={6} />
      </div>

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  )
}
