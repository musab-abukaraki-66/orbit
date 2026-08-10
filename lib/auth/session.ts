import { cache } from "react"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const requireUser = cache(async () => {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }
  return user
})

export const getFirstTeam = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("team_memberships")
    .select("team_id, teams ( id, name, slug )")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  return data?.teams ?? null
})
