"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export type ProfileState = { ok: boolean; message?: string } | undefined

export async function updateProfile(slug: string, _prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const fullName = String(formData.get("fullName") ?? "").trim().slice(0, 80)
  if (!fullName) return { ok: false, message: "Enter your name." }
  const user = await requireUser()
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } })
  if (error) return { ok: false, message: error.message }
  await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id)
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true, message: "Profile saved." }
}
