import type { Metadata } from "next"

import { getStatusesForWorkspace } from "@/lib/items/data"
import { createClient } from "@/lib/supabase/server"
import { requireWorkspace } from "@/lib/workspaces/context"
import { StatusesEditor } from "@/components/settings/statuses-editor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Statuses" }

export default async function StatusesSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const context = await requireWorkspace(slug)
  const supabase = await createClient()
  const [statuses, team, counts] = await Promise.all([
    getStatusesForWorkspace(context.id),
    supabase.from("teams").select("id, name").eq("workspace_id", context.id).eq("is_default", true).maybeSingle(),
    supabase.from("work_items").select("status_id").eq("workspace_id", context.id).is("archived_at", null),
  ])
  const usage: Record<string, number> = {}
  for (const row of counts.data ?? []) usage[row.status_id] = (usage[row.status_id] ?? 0) + 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statuses</CardTitle>
        <CardDescription>The columns on every board. Each status belongs to a category so progress is calculated correctly (Backlog → Unstarted → Started → Completed / Canceled).</CardDescription>
      </CardHeader>
      <CardContent>
        {team.data ? (
          <StatusesEditor slug={slug} teamId={team.data.id} statuses={statuses.filter((s) => s.team_id === team.data!.id)} usage={usage} canEdit={context.isAdmin} />
        ) : (
          <p className="text-sm text-muted-foreground">No team found.</p>
        )}
      </CardContent>
    </Card>
  )
}
