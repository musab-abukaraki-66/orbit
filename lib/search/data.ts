import { createClient } from "@/lib/supabase/server"

export type SearchResults = {
  projects: { id: string; name: string; slug: string; status: string }[]
  items: { id: string; key: string; title: string; project_slug: string | null }[]
  members: { id: string; full_name: string | null; email: string | null }[]
}

// Escapes LIKE wildcards and drops the characters PostgREST uses to delimit
// `or()` filters, which would otherwise turn the query into a 400.
function escapeLike(value: string) {
  return value.replace(/[,()]/g, " ").replace(/[%_\\]/g, (m) => `\\${m}`)
}

export async function searchWorkspace(workspaceId: string, query: string): Promise<SearchResults> {
  const q = query.trim()
  if (q.length < 1) return { projects: [], items: [], members: [] }
  const pattern = `%${escapeLike(q)}%`
  const supabase = await createClient()

  const [projects, items, members] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, slug, status")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .ilike("name", pattern)
      .limit(8),
    supabase
      .from("work_items")
      .select("id, key, title, projects ( slug )")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .or(`title.ilike.${pattern},key.ilike.${pattern}`)
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("workspace_memberships")
      .select("profiles!inner ( id, full_name, email )")
      .eq("workspace_id", workspaceId)
      .or(`full_name.ilike.${pattern},email.ilike.${pattern}`, { referencedTable: "profiles" })
      .limit(8),
  ])

  return {
    projects: projects.data ?? [],
    items: (items.data ?? []).map((row) => ({ id: row.id, key: row.key, title: row.title, project_slug: row.projects?.slug ?? null })),
    members: (members.data ?? []).map((row) => row.profiles).filter((p): p is NonNullable<typeof p> => Boolean(p)),
  }
}
