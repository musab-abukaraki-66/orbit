"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { acceptInvitation } from "@/lib/team/actions"
import { Button } from "@/components/ui/button"

export function AcceptInvitationButton({ token }: { token: string }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleAccept() {
    setPending(true)
    setError(null)
    const result = await acceptInvitation(token)
    if (!result.ok) {
      setError(result.message ?? "Could not accept this invitation.")
      setPending(false)
      return
    }
    setPending(false)
    router.push("/app")
    router.refresh()
  }

  return (
    <form
      action={() => void handleAccept()}
      className="flex flex-col items-center gap-3"
    >
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Accepting…" : "Join the team"}
      </Button>
    </form>
  )
}