import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { getFirstTeam, requireUser } from "@/lib/auth/session"
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

  const team = await getFirstTeam(user.id)
  if (!team) {
    redirect("/onboarding")
  }

  return (
    <SidebarProvider>
      <AppSidebar teamName={team.name} />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
