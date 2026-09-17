import { createClient } from "@/lib/supabase/server"

// A recovery link is good for one password change, so the recovery entry in
// the JWT's `amr` claim must be recent. After that the (still valid) session
// behaves like any other sign-in and can no longer reach /update-password.
const RECOVERY_WINDOW_SECONDS = 60 * 60

// True only when the current session was created by a password-recovery link
// (Supabase records the sign-in method in the JWT's `amr` claim). A normal
// password session must not be enough to reach the update-password page.
export async function hasRecoverySession(): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) return false

  const now = Math.floor(Date.now() / 1000)
  const amr = data.claims.amr ?? []
  return amr.some((entry) => {
    if (typeof entry === "string") return entry === "recovery"
    return entry.method === "recovery" && now - entry.timestamp < RECOVERY_WINDOW_SECONDS
  })
}
