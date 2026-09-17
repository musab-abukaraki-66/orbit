"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireUser } from "@/lib/auth/session"
import { slugify } from "@/lib/slugify"
import { deriveKey } from "@/lib/workspaces/key"
import { createClient } from "@/lib/supabase/server"

export type FormState = { ok: boolean; message?: string } | undefined

export async function createWorkspace(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim()
  const withSample = String(formData.get("sample") ?? "on") !== "off"
  if (name.length < 2) return { ok: false, message: "Give your workspace a name (at least 2 characters)." }

  await requireUser()
  const supabase = await createClient()
  const base = slugify(name).slice(0, 36) || "workspace"
  const key = deriveKey(name)

  let slug = base
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await supabase.rpc("create_workspace", { p_name: name, p_slug: slug, p_key: key })
    if (!error && data) {
      if (withSample) {
        await supabase.rpc("seed_sample_project", { p_workspace: data })
      }
      revalidatePath("/", "layout")
      redirect(`/w/${slug}?welcome=1`)
    }
    if (error && !/duplicate|unique|already exists/i.test(error.message)) {
      return { ok: false, message: error.message }
    }
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`
  }
  return { ok: false, message: "Could not create the workspace. Please try again." }
}

export async function updateWorkspace(workspaceId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim()
  if (name.length < 2) return { ok: false, message: "Workspace name must be at least 2 characters." }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workspaces")
    .update({ name })
    .eq("id", workspaceId)
    .select("slug")
    .maybeSingle()
  if (error) return { ok: false, message: friendly(error.message, "Could not update the workspace.") }
  if (!data) return { ok: false, message: "You don't have permission to rename this workspace." }
  revalidatePath(`/w/${data.slug}`, "layout")
  return { ok: true, message: "Workspace updated." }
}

const DB_MESSAGES: Record<string, string> = {
  last_owner: "Transfer ownership to someone else first — a workspace always needs an owner.",
  forbidden: "You don't have permission to do that.",
}

function friendly(message: string, fallback: string) {
  return DB_MESSAGES[message] ?? (/^[a-z_]+$/.test(message) ? fallback : message)
}

export async function deleteWorkspace(workspaceId: string): Promise<FormState> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("workspaces").delete().eq("id", workspaceId).select("id").maybeSingle()
  if (error) return { ok: false, message: friendly(error.message, "Could not delete the workspace.") }
  if (!data) return { ok: false, message: "Only the workspace owner can delete it." }
  revalidatePath("/", "layout")
  redirect("/app")
}
