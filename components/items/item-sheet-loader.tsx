import { getActivityForItem, getCommentsForItem, getItemByKey, getLabelsForWorkspace, getProfilesForWorkspace, getStatusesForWorkspace } from "@/lib/items/data"
import type { WorkspaceContext } from "@/lib/workspaces/context"
import { ItemDetailSheet } from "@/components/items/item-detail-sheet"
import { ItemDetail } from "@/components/items/item-detail"
import { createClient } from "@/lib/supabase/server"

export async function loadItemDetail(context: WorkspaceContext, key: string) {
  const item = await getItemByKey(context.id, key)
  if (!item) return null
  const supabase = await createClient()
  const [statuses, labels, profiles, comments, activity, projectRow] = await Promise.all([
    getStatusesForWorkspace(context.id),
    getLabelsForWorkspace(context.id),
    getProfilesForWorkspace(context.id),
    getCommentsForItem(item.id),
    getActivityForItem(item.id),
    supabase.from("projects").select("slug, name").eq("id", item.project_id).maybeSingle(),
  ])
  return {
    slug: context.slug,
    workspaceId: context.id,
    projectSlug: projectRow.data?.slug ?? "",
    projectName: projectRow.data?.name ?? "Project",
    item,
    statuses: statuses.filter((s) => s.team_id === item.team_id),
    labels,
    profiles,
    comments,
    activity,
    currentUserId: context.userId,
    isAdmin: context.isAdmin,
  }
}

export async function ItemSheetLoader({ context, itemKey }: { context: WorkspaceContext; itemKey: string | undefined }) {
  if (!itemKey) return null
  const props = await loadItemDetail(context, itemKey)
  if (!props) return null
  return <ItemDetailSheet {...props} />
}

export async function ItemPageLoader({ context, itemKey }: { context: WorkspaceContext; itemKey: string }) {
  const props = await loadItemDetail(context, itemKey)
  if (!props) return null
  return (
    <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card">
      <ItemDetail {...props} standalone />
    </div>
  )
}
