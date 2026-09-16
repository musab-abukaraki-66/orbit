import type { Metadata } from "next"

import { getLabelsForWorkspace } from "@/lib/items/data"
import { createClient } from "@/lib/supabase/server"
import { requireWorkspace } from "@/lib/workspaces/context"
import { LabelsEditor } from "@/components/settings/labels-editor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Labels" }

export default async function LabelsSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const context = await requireWorkspace(slug)
  const supabase = await createClient()
  const [labels, usageRows] = await Promise.all([getLabelsForWorkspace(context.id), supabase.from("work_item_labels").select("label_id")])
  const usage: Record<string, number> = {}
  for (const row of usageRows.data ?? []) usage[row.label_id] = (usage[row.label_id] ?? 0) + 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Labels</CardTitle>
        <CardDescription>Labels are shared across every project in the workspace. Anyone can create one; owners and admins can rename or delete them.</CardDescription>
      </CardHeader>
      <CardContent>
        <LabelsEditor slug={slug} workspaceId={context.id} labels={labels} usage={usage} canEdit={context.isAdmin} />
      </CardContent>
    </Card>
  )
}
