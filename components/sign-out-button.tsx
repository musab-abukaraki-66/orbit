"use client"

import { LogOut } from "lucide-react"

import { signout } from "@/lib/auth/actions"
import { Button } from "@/components/ui/button"

export function SignOutButton({
  className,
  label = "Sign out",
}: {
  className?: string
  label?: string
}) {
  return (
    <form action={signout}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className={className}
        aria-label="Sign out"
      >
        <LogOut />
        {label}
      </Button>
    </form>
  )
}
