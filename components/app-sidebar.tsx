"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Inbox,
  Kanban,
  Settings,
  Users,
  UserRound,
} from "lucide-react"

import type { WorkspaceContext } from "@/lib/workspaces/data"
import { OrbitMark } from "@/components/orbit-mark"
import { SignOutButton } from "@/components/sign-out-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { SidebarBoards } from "@/components/sidebar-boards"
import { WorkspacePicker } from "@/components/workspace-picker"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const mainNav = [
  { title: "Home", url: "/app", icon: Home },
  { title: "Inbox", url: "/app/inbox", icon: Inbox },
  { title: "Boards", url: "/app/boards", icon: Kanban },
]

const accountNav = [
  { title: "Team", url: "/app/team", icon: Users },
  { title: "Profile", url: "/app/profile", icon: UserRound },
  { title: "Settings", url: "/app/settings", icon: Settings },
]

export function AppSidebar({ context }: { context: WorkspaceContext }) {
  const pathname = usePathname()

  const isActive = (url: string) =>
    pathname === url || (url !== "/app" && pathname.startsWith(`${url}/`))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/app" />}
              className="group-data-[state=collapsed]:justify-center"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-brand text-white">
                <OrbitMark className="size-5" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5 leading-none">
                <span className="truncate text-sm font-semibold">
                  {context.team.name}
                </span>
                <span className="text-xs text-muted-foreground">Team</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-1">
            <WorkspacePicker
              workspaces={context.workspaces}
              activeWorkspaceId={context.activeWorkspace?.id ?? null}
              className="group-data-[collapsible=icon]:hidden"
            />
            <SidebarBoards
              boards={context.boards}
              workspaceId={context.activeWorkspace?.id ?? null}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2 py-1">
              <SignOutButton label="Sign out" className="h-7 px-2" />
              <ThemeToggle />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
