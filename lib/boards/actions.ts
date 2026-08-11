"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export type BoardFormState =
  | {
      ok: boolean
      message?: string
    }
  | undefined

export type BoardActionResult = {
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

export async function createBoard(
  workspaceId: string,
  _prevState: BoardFormState,
  formData: FormData,
): Promise<BoardFormState> {
  const name = String(formData.get("name") ?? "").trim()
  if (!name) {
    return { ok: false, message: "Please give your board a name." }
  }

  const { supabase } = await getCurrentUserOrRedirect()
  const { data, error } = await supabase
    .from("boards")
    .insert({ workspace_id: workspaceId, name })
    .select("id")
    .single()

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/app", "layout")
  redirect(`/app/boards/${data.id}`)
}

export async function renameBoard(
  boardId: string,
  _prevState: BoardFormState,
  formData: FormData,
): Promise<BoardFormState> {
  const name = String(formData.get("name") ?? "").trim()
  if (!name) {
    return { ok: false, message: "Please give your board a name." }
  }

  const { supabase } = await getCurrentUserOrRedirect()
  const { data, error } = await supabase
    .from("boards")
    .update({ name })
    .eq("id", boardId)
    .select("id")
    .maybeSingle()

  if (error) {
    return { ok: false, message: error.message }
  }
  if (!data) {
    return { ok: false, message: "Board not found." }
  }

  revalidatePath("/app", "layout")
  return { ok: true }
}

export async function deleteBoard(
  boardId: string,
): Promise<BoardActionResult> {
  const { supabase } = await getCurrentUserOrRedirect()

  const { data, error } = await supabase
    .from("boards")
    .delete()
    .eq("id", boardId)
    .select("id")
    .maybeSingle()

  if (error) {
    return { ok: false, message: error.message }
  }
  if (!data) {
    return { ok: false, message: "Board not found." }
  }

  revalidatePath("/app", "layout")
  return { ok: true }
}
