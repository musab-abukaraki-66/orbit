"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { sendWelcomeEmail } from "@/lib/resend/welcome"
import { safeNext } from "@/lib/auth/next"
import { isValidEmail, validateNewPassword } from "@/lib/auth/password"
import { hasRecoverySession } from "@/lib/auth/recovery"
import { getSiteOrigin } from "@/lib/site-url"
import { createClient } from "@/lib/supabase/server"

export type AuthFormState = { message: string } | undefined
export type ResetRequestState = { ok: true } | { ok: false; message: string } | undefined

function friendlyAuthError(message: string) {
  if (/fetch failed|network|ECONN/i.test(message)) {
    return "We couldn't reach the server. Check your connection and try again."
  }
  if (/already registered|already exists/i.test(message)) {
    return "An account with that email already exists. Try signing in instead."
  }
  if (/password/i.test(message) && /short|least/i.test(message)) {
    return "Your password must be at least 6 characters long."
  }
  if (/rate limit/i.test(message)) {
    return "Too many attempts. Please wait a moment and try again."
  }
  return message
}

export async function signin(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const next = safeNext(formData.get("next"))

  if (!email || !password) return { message: "Please enter your email and password." }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      return { message: "Invalid email or password. Please try again." }
    }
    return { message: friendlyAuthError(error.message) }
  }

  redirect(next ?? "/app")
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const fullName = String(formData.get("fullName") ?? "").trim()
  const next = safeNext(formData.get("next"))

  if (!email || !fullName) return { message: "Please enter your name and email." }
  if (!isValidEmail(email)) return { message: "Please enter a valid email address." }
  const problem = validateNewPassword(password)
  if (problem) return { message: problem }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${getSiteOrigin()}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`,
    },
  })

  if (error) return { message: friendlyAuthError(error.message) }

  if (data.session && data.user) {
    const userEmail = data.user.email ?? email
    after(async () => {
      await sendWelcomeEmail(userEmail, fullName)
    })
    redirect(next ?? "/app")
  }

  return { message: "Check your email to confirm your account before signing in." }
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

// Sign out and come back to a specific page (e.g. an invitation link) so the
// person can sign in with a different account. Only same-site paths.
export async function switchAccount(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""))
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`)
}

// Always answers the same way so the form can't be used to discover which
// emails have accounts. Supabase Auth sends the recovery email through its
// configured SMTP; the link lands on /auth/callback and then /update-password.
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim()
  if (!isValidEmail(email)) return { ok: false, message: "Please enter a valid email address." }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent("/update-password")}`,
  })
  if (error) {
    // Logged for the operator, never surfaced: the response must not reveal
    // whether the address exists or whether mail went out.
    console.error(`[auth] resetPasswordForEmail failed: ${error.message}`)
  }
  return { ok: true }
}

// Only valid inside a session created by a recovery link. The password never
// leaves this request: Supabase Auth hashes and stores it.
export async function updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirm") ?? "")

  const problem = validateNewPassword(password, confirm)
  if (problem) return { message: problem }

  if (!(await hasRecoverySession())) {
    return { message: "This reset link is no longer valid. Request a new one and try again." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    if (/different from the old password/i.test(error.message)) {
      return { message: "Choose a password you haven't used before." }
    }
    return { message: friendlyAuthError(error.message) }
  }

  redirect("/app")
}
