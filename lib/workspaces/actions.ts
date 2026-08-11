"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { slugify } from "@/lib/slugify"
import { createClient } from "@/lib/supabase/server"
import { getFirstTeam } from "@/lib/auth/session"
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/workspaces/data"

export type WorkspaceFormState =
  | {
      ok: boolean
      message?: string
    }
  | undefined

export type WorkspaceActionResult = {
  ok: boolean
  message?: string
}

async function getCurrentUserOrRedirect() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return { supabase, user }
}

export async function createWorkspace(
  _prevState: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  const name = String(formData.get("name") ?? "").trim()
  if (!name) {
    return { ok: false, message: "Please give your workspace a name." }
  }

  const { supabase, user } = await getCurrentUserOrRedirect()
  const team = await getFirstTeam(user.id)
  if (!team) redirect("/onboarding")

  const baseSlug = slugify(name)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const suffix =
      attempt === 0 ? "" : `-${Math.random().toString(36).slice(2, 6)}`
    const { data, error } = await supabase
      .from("workspaces")
      .insert({ team_id: team.id, name, slug: `${baseSlug}${suffix}` })
      .select("id")
      .single()

    if (!error) {
      const cookieStore = await cookies()
      cookieStore.set(ACTIVE_WORKSPACE_COOKIE, data.id, {
        path: "/",
        sameSite: "lax",
      })
      revalidatePath("/app", "layout")
      redirect("/app")
    }

    const isUniqueViolation = error.code === "23505"
    if (!isUniqueViolation) {
      return { ok: false, message: error.message }
    }
  }

  return {
    ok: false,
    message: "Could not create your workspace. Please try again.",
  }
}

export async function switchWorkspace(
  workspaceId: string,
): Promise<WorkspaceActionResult> {
  const { supabase, user } = await getCurrentUserOrRedirect()
  const team = await getFirstTeam(user.id)
  if (!team) redirect("/onboarding")

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("team_id", team.id)
    .maybeSingle()

  if (!workspace) {
    return { ok: false, message: "Workspace not found." }
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspace.id, {
    path: "/",
    sameSite: "lax",
  })
  revalidatePath("/", "layout")

  return { ok: true }
}

export async function renameWorkspace(
  workspaceId: string,
  _prevState: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  const name = String(formData.get("name") ?? "").trim()
  if (!name) {
    return { ok: false, message: "Please give your workspace a name." }
  }

  const { supabase } = await getCurrentUserOrRedirect()
  const { data, error } = await supabase
    .from("workspaces")
    .update({ name })
    .eq("id", workspaceId)
    .select("id")
    .maybeSingle()

  if (error) {
    return { ok: false, message: error.message }
  }
  if (!data) {
    return { ok: false, message: "Workspace not found." }
  }

  revalidatePath("/app", "layout")
  return { ok: true }
}

export async function deleteWorkspace(
  workspaceId: string,
): Promise<WorkspaceActionResult> {
  const { supabase } = await getCurrentUserOrRedirect()

  const { data, error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId)
    .select("id")
    .maybeSingle()

  if (error) {
    return { ok: false, message: error.message }
  }
  if (!data) {
    return { ok: false, message: "Workspace not found." }
  }

  revalidatePath("/app", "layout")
  return { ok: true }
}
