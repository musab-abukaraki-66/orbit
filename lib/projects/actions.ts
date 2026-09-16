"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { slugify } from "@/lib/slugify"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"

type ProjectStatus = Database["public"]["Enums"]["project_status"]
type ProjectHealth = Database["public"]["Enums"]["project_health"]

export type FormState = { ok: boolean; message?: string } | undefined
export type ActionResult = { ok: boolean; message?: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STATUSES: ProjectStatus[] = ["backlog", "planned", "in_progress", "completed", "canceled"]
const HEALTHS: ProjectHealth[] = ["on_track", "at_risk", "off_track"]

function readProjectFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim() || null
  const status = String(formData.get("status") ?? "planned") as ProjectStatus
  const leadRaw = String(formData.get("lead_id") ?? "").trim()
  const targetRaw = String(formData.get("target_date") ?? "").trim()
  return {
    name,
    description,
    status: STATUSES.includes(status) ? status : "planned",
    lead_id: UUID.test(leadRaw) ? leadRaw : null,
    target_date: /^\d{4}-\d{2}-\d{2}$/.test(targetRaw) ? targetRaw : null,
  }
}

export async function createProject(workspaceId: string, slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const fields = readProjectFields(formData)
  if (fields.name.length < 2) return { ok: false, message: "Give the project a name (at least 2 characters)." }
  const supabase = await createClient()
  const base = slugify(fields.name).slice(0, 50) || "project"

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const projectSlug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`
    const { data, error } = await supabase
      .from("projects")
      .insert({
        workspace_id: workspaceId,
        name: fields.name,
        slug: projectSlug,
        description: fields.description,
        status: fields.status,
        lead_id: fields.lead_id ?? undefined,
        target_date: fields.target_date,
      })
      .select("slug")
      .single()
    if (!error && data) {
      revalidatePath(`/w/${slug}`, "layout")
      redirect(`/w/${slug}/projects/${data.slug}`)
    }
    if (error && error.code !== "23505") return { ok: false, message: error.message }
  }
  return { ok: false, message: "Could not create the project. Please try again." }
}

export async function updateProject(projectId: string, slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!UUID.test(projectId)) return { ok: false, message: "Invalid project." }
  const fields = readProjectFields(formData)
  if (fields.name.length < 2) return { ok: false, message: "Project name must be at least 2 characters." }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .update(fields)
    .eq("id", projectId)
    .select("slug")
    .maybeSingle()
  if (error) return { ok: false, message: error.message }
  if (!data) return { ok: false, message: "Only the project lead or a workspace admin can edit this project." }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true, message: "Project saved." }
}

export async function setProjectStatus(projectId: string, slug: string, status: ProjectStatus): Promise<ActionResult> {
  if (!UUID.test(projectId) || !STATUSES.includes(status)) return { ok: false, message: "Invalid request." }
  const supabase = await createClient()
  const { data, error } = await supabase.from("projects").update({ status }).eq("id", projectId).select("id").maybeSingle()
  if (error) return { ok: false, message: error.message }
  if (!data) return { ok: false, message: "You can't change this project." }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}

export async function archiveProject(projectId: string, slug: string, archived: boolean): Promise<ActionResult> {
  if (!UUID.test(projectId)) return { ok: false, message: "Invalid project." }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("projects")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", projectId)
    .select("id")
    .maybeSingle()
  if (error) return { ok: false, message: error.message }
  if (!data) return { ok: false, message: "You can't archive this project." }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}

export async function deleteProject(projectId: string, slug: string): Promise<ActionResult> {
  if (!UUID.test(projectId)) return { ok: false, message: "Invalid project." }
  const supabase = await createClient()
  const { data, error } = await supabase.from("projects").delete().eq("id", projectId).select("id").maybeSingle()
  if (error) return { ok: false, message: error.message }
  if (!data) return { ok: false, message: "Only workspace admins can delete a project." }
  revalidatePath(`/w/${slug}`, "layout")
  redirect(`/w/${slug}/projects`)
}

export async function addProjectMember(projectId: string, slug: string, userId: string): Promise<ActionResult> {
  if (!UUID.test(projectId) || !UUID.test(userId)) return { ok: false, message: "Invalid request." }
  const supabase = await createClient()
  const { error } = await supabase.from("project_memberships").upsert({ project_id: projectId, user_id: userId })
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}

export async function removeProjectMember(projectId: string, slug: string, userId: string): Promise<ActionResult> {
  if (!UUID.test(projectId) || !UUID.test(userId)) return { ok: false, message: "Invalid request." }
  const supabase = await createClient()
  const { error } = await supabase.from("project_memberships").delete().eq("project_id", projectId).eq("user_id", userId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true }
}

export async function postProjectUpdate(projectId: string, slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!UUID.test(projectId)) return { ok: false, message: "Invalid project." }
  const body = String(formData.get("body") ?? "").trim()
  const health = String(formData.get("health") ?? "on_track") as ProjectHealth
  if (body.length < 3) return { ok: false, message: "Write a short update first." }
  if (!HEALTHS.includes(health)) return { ok: false, message: "Pick a health status." }
  const supabase = await createClient()
  const { error } = await supabase.from("project_updates").insert({ project_id: projectId, body, health })
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/w/${slug}`, "layout")
  return { ok: true, message: "Update posted." }
}
