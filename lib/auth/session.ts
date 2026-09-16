import { cache } from "react"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const requireUser = cache(async () => {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
})

export function displayName(user: { user_metadata?: Record<string, unknown>; email?: string | null }) {
  const full = String(user.user_metadata?.full_name ?? "").trim()
  return full || user.email?.split("@")[0] || "there"
}

export function firstNameOf(user: { user_metadata?: Record<string, unknown>; email?: string | null }) {
  return displayName(user).split(/\s+/)[0]
}
