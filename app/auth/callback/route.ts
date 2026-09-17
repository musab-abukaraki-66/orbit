import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

import { safeNext } from "@/lib/auth/next"
import { createClient } from "@/lib/supabase/server"

// Landing point for Supabase Auth email links (password recovery today).
// Supports both link shapes Supabase can produce:
//   ?code=…                      PKCE, the default email template
//   ?token_hash=…&type=recovery  custom template using {{ .TokenHash }}
// On success the session cookies are set and we continue to `next`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = safeNext(searchParams.get("next")) ?? "/update-password"

  const supabase = await createClient()
  let failed = true

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    failed = Boolean(error)
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    failed = Boolean(error)
  }

  if (failed) {
    return NextResponse.redirect(new URL("/forgot-password?error=link", origin))
  }
  return NextResponse.redirect(new URL(next, origin))
}
