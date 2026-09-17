import type { SupabaseClient } from "@supabase/supabase-js"

// Realtime validates postgres_changes filters with the role in the JWT the
// socket presented. If a channel joins before the browser client has applied
// the signed-in session, the join carries the anon key, anon has no table
// grants, and the subscription is rejected ("invalid column for filter").
// Always push the session token to the socket before subscribing.
export async function ensureRealtimeAuth(supabase: SupabaseClient<never, never, never> | SupabaseClient): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return false
  await supabase.realtime.setAuth(token)
  return true
}
