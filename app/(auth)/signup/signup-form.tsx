"use client"

import Link from "next/link"
import { useActionState } from "react"

import { signup, type AuthFormState } from "@/lib/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SignupForm() {
  const [state, formAction, pending] = useActionState<
    AuthFormState,
    FormData
  >(signup, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.message ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.message}
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
          placeholder="At least 6 characters"
          required
        />
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
