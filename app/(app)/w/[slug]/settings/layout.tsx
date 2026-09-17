import type { ReactNode } from "react"

import { requireWorkspace } from "@/lib/workspaces/context"
import { SettingsNav } from "@/components/settings/settings-nav"

export default async function SettingsLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const context = await requireWorkspace(slug)
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage {context.name}, its people and how it works.</p>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <SettingsNav slug={slug} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
