"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { sendWelcomeEmail } from "@/lib/resend/welcome"
import { getSiteOrigin } from "@/lib/site-url"
import { createClient } from "@/lib/supabase/server"

export type AuthFormState =
  | {
      message: string
    }
  | undefined

// Only ever redirect to a same-origin path so a crafted `next` can't be used
// as an open redirect.
function safeNext(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim()
  if (!value.startsWith("/")) return null
  if (value.startsWith("//")) return null
  return value
}

export async function signin(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const next = safeNext(formData.get("next"))

  if (!email || !password) {
    return { message: "Please enter your email and password." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      message: "Invalid email or password. Please try again.",
    }
  }

  redirect(next ?? "/app")
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const fullName = String(formData.get("fullName") ?? "").trim()
  const next = safeNext(formData.get("next"))

  if (!email || !fullName) {
    return { message: "Please enter your name and email." }
  }
  if (password.length < 6) {
    return {
      message: "Your password must be at least 6 characters long.",
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${getSiteOrigin()}/login`,
    },
  })

  if (error) {
    return {
      message: error.message,
    }
  }

  if (data.session && data.user) {
    const userEmail = data.user.email ?? email
    after(async () => {
      await sendWelcomeEmail(userEmail, fullName)
    })
    redirect(next ?? "/app")
  }

  return {
    message:
      "Check your email to confirm your account before signing in.",
  }
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  return base || "team"
}

export async function createTeam(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim()

  if (!name) {
    return { message: "Please give your team a name." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const baseSlug = slugify(name)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const suffix =
      attempt === 0 ? "" : `-${Math.random().toString(36).slice(2, 6)}`
    const { error } = await supabase.from("teams").insert({
      name,
      slug: `${baseSlug}${suffix}`,
      created_by: user.id,
    })

    if (!error) {
      redirect("/app")
    }

    const isUniqueViolation = error.code === "23505"
    if (!isUniqueViolation) {
      return { message: error.message }
    }
  }

  return {
    message: "Could not create your team. Please try again.",
  }
}

