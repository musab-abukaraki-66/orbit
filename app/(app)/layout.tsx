import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { requireUser } from "@/lib/auth/session"
import { getWorkspaceContext } from "@/lib/workspaces/data"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default async function AppShellLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await requireUser()

  const context = await getWorkspaceContext(user.id)
  if (!context) {
    redirect("/onboarding")
  }

  return (
    <SidebarProvider>
      <AppSidebar context={context} />
      <SidebarInset className="min-w-0">
        <SiteHeader />
        <div className="flex min-w-0 flex-1 flex-col p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
