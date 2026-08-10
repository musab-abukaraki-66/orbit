"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Inbox,
  Kanban,
  Settings,
  Users,
  ChevronsUpDown,
  UserRound,
} from "lucide-react"

import { OrbitMark } from "@/components/orbit-mark"
import { SignOutButton } from "@/components/sign-out-button"
import { ThemeToggle } from "@/components/theme-toggle"
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
} from "@/components/ui/sidebar"

const mainNav = [
  { title: "Home", url: "/app", icon: Home },
  { title: "Inbox", url: "/app/inbox", icon: Inbox },
  { title: "Boards", url: "/app/boards", icon: Kanban },
]

const workspaceNav = [
  { title: "Team", url: "/app/team", icon: Users },
  { title: "Profile", url: "/app/profile", icon: UserRound },
  { title: "Settings", url: "/app/settings", icon: Settings },
]

export function AppSidebar({ teamName }: { teamName: string }) {
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
                  {teamName}
                </span>
                <span className="text-xs text-muted-foreground">
                  Workspace
                </span>
              </div>
              <ChevronsUpDown className="size-4 text-muted-foreground" />
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
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceNav.map((item) => (
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
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
