import { createClient } from "@/lib/supabase/server"
import type { ProfilePayload } from "@/lib/tasks/types"

// Profiles the current user is allowed to see: their own plus anyone they
// share a team with (enforced by the `profiles_select` RLS policy). This is
// the assignee pool for task cards — no client-side access to auth data.
export async function getVisibleProfiles(): Promise<ProfilePayload[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .order("full_name", { ascending: true })

  return (data ?? []) as ProfilePayload[]
}
