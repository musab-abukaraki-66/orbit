import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import type { TeamRole } from "@/lib/team/actions"

// Role of the current user in a team, or null if they're not a member.
export const getMyTeamRole = cache(
  async (teamId: string): Promise<TeamRole | null> => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle()

    return data ? (data.role as TeamRole) : null
  },
)