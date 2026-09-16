"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { sendWelcomeEmail } from "@/lib/resend/welcome"
import { safeNext } from "@/lib/auth/next"
import { getSiteOrigin } from "@/lib/site-url"
import { createClient } from "@/lib/supabase/server"

export type AuthFormState = { message: string } | undefined

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
  if (password.length < 6) return { message: "Your password must be at least 6 characters long." }

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
