import type { ReactNode } from "react"

import { getProfilesForWorkspace } from "@/lib/items/data"
import { getUnreadCount } from "@/lib/notifications/data"
import { getProjects } from "@/lib/projects/data"
import { getUserWorkspaces, requireWorkspace } from "@/lib/workspaces/context"
import { AppSidebar } from "@/components/app-sidebar"
import { LiveRefresh } from "@/components/realtime/use-live-refresh"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default async function WorkspaceLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const context = await requireWorkspace(slug)
  const [workspaces, projects, unreadCount, members] = await Promise.all([
    getUserWorkspaces(),
    getProjects(context.id),
    getUnreadCount(context.id),
    getProfilesForWorkspace(context.id),
  ])

  const navProjects = projects.map((p) => ({ id: p.id, name: p.name, slug: p.slug, status: p.status }))

  return (
    <SidebarProvider>
      <LiveRefresh
        channelKey={`ws-${context.id}-${context.userId}`}
        subscriptions={[
          { table: "notifications", filter: `user_id=eq.${context.userId}` },
          { table: "projects", filter: `workspace_id=eq.${context.id}` },
        ]}
      />
      <AppSidebar context={context} workspaces={workspaces} projects={navProjects} unreadCount={unreadCount} members={members} />
      <SidebarInset className="min-w-0">
        <SiteHeader slug={context.slug} unreadCount={unreadCount} projects={navProjects} />
        <div className="flex min-w-0 flex-1 flex-col p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
