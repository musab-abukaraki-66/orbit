import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

// Cookie that remembers which team a user is currently working in. Falls back
// to the first team when unset, so a user who joins an additional team via an
// invitation doesn't silently lose their existing "current team" context.
export const ACTIVE_TEAM_COOKIE = "orbit_active_team"

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

// Resolve the user's current team: whatever team is saved in
// ACTIVE_TEAM_COOKIE (only if they're still a member of it), otherwise their
// first team. Used everywhere M1-M5 resolved "the" team so that a user who
// accepts an extra invitation keeps a stable, predictable current-team.
export const getActiveTeam = cache(async (userId: string) => {
  const cookieStore = await cookies()
  const cookieTeamId = cookieStore.get(ACTIVE_TEAM_COOKIE)?.value

  if (cookieTeamId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("team_memberships")
      .select("team_id, teams ( id, name, slug )")
      .eq("user_id", userId)
      .eq("team_id", cookieTeamId)
      .maybeSingle()

    if (data?.teams) {
      return data.teams
    }
  }

  return getFirstTeam(userId)
})
