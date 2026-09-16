"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { acceptInvitation } from "@/lib/members/actions"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function AcceptInvitationButton({ token }: { token: string }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={async () => {
          setPending(true)
          setError(null)
          const result = await acceptInvitation(token)
          if (!result.ok) {
            setError(result.message ?? "Could not accept the invitation.")
            setPending(false)
            return
          }
          router.push(result.slug ? `/w/${result.slug}?welcome=1` : "/app")
          router.refresh()
        }}
      >
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
      {error ? <Alert className="w-full">{error}</Alert> : null}
    </div>
  )
}
