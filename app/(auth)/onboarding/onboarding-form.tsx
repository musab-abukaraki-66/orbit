"use client"

import { useActionState } from "react"

import { createTeam, type AuthFormState } from "@/lib/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<
    AuthFormState,
    FormData
  >(createTeam, undefined)

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
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Team name
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Acme Studio"
          autoFocus
          required
        />
      </div>

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Creating team…" : "Create team"}
      </Button>
    </form>
  )
}
