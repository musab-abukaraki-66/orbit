import type { Metadata } from "next"

import { requireWorkspace } from "@/lib/workspaces/context"
import { WorkspaceGeneralForm } from "@/components/settings/workspace-general-form"
import { DangerZone } from "@/components/settings/danger-zone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Workspace settings" }

export default async function GeneralSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const context = await requireWorkspace(slug)
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Name and identifiers. Tasks are numbered {context.key}-1, {context.key}-2, …</CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceGeneralForm workspace={context} canEdit={context.isAdmin} />
        </CardContent>
      </Card>
      <DangerZone workspace={context} />
    </div>
  )
}
