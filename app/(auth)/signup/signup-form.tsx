"use client"

import Link from "next/link"
import { useActionState, useState } from "react"

import { signup, type AuthFormState } from "@/lib/auth/actions"
import { validateNewPassword } from "@/lib/auth/password"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SignupForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<
    AuthFormState,
    FormData
  >(signup, undefined)
  const [clientError, setClientError] = useState<string | null>(null)
  const error = clientError ?? state?.message

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const password = String(new FormData(event.currentTarget).get("password") ?? "")
        const problem = validateNewPassword(password)
        if (problem) {
          event.preventDefault()
          setClientError(problem)
          return
        }
        setClientError(null)
      }}
      className="flex flex-col gap-4"
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="fullName"
          className="text-sm font-medium text-foreground"
        >
          Full name
        </label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Ada Lovelace"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-foreground"
        >
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-foreground"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          placeholder="At least 6 characters, a letter and a number"
          required
        />
        <p className="text-xs text-muted-foreground">At least 6 characters, with at least one letter and one number.</p>
      </div>

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
