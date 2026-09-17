"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Activity,
  Check,
  ChevronsUpDown,
  CircleUserRound,
  FolderKanban,
  Inbox,
  Plus,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react"

import type { WorkspaceContext } from "@/lib/workspaces/context"
import { cn } from "@/lib/utils"
import { OrbitMark } from "@/components/orbit-mark"
import { SignOutButton } from "@/components/sign-out-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ProjectFormDialog } from "@/components/projects/project-form-dialog"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

export type SidebarProject = { id: string; name: string; slug: string; status: string }
export type SidebarWorkspace = { id: string; name: string; slug: string; role: string }

export function AppSidebar({
  context,
  workspaces,
  projects,
  unreadCount,
  members,
}: {
  context: WorkspaceContext
  workspaces: SidebarWorkspace[]
  projects: SidebarProject[]
  unreadCount: number
  members: { id: string; full_name: string | null; email: string | null }[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()
  const [projectDialogOpen, setProjectDialogOpen] = React.useState(false)
  const base = `/w/${context.slug}`

  const isActive = (url: string, exact = false) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(`${url}/`)

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  const mainNav = [
    { title: "Pulse", url: base, icon: Activity, exact: true, badge: 0 },
    { title: "My work", url: `${base}/my-work`, icon: CircleUserRound, exact: false, badge: 0 },
    { title: "Inbox", url: `${base}/inbox`, icon: Inbox, exact: false, badge: unreadCount },
    { title: "Projects", url: `${base}/projects`, icon: FolderKanban, exact: true, badge: 0 },
  ]

  const activeProjects = projects.filter((p) => p.status !== "completed" && p.status !== "canceled")

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent" />}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
                  <OrbitMark className="size-5" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-semibold">{context.name}</span>
                  <span className="truncate text-xs text-muted-foreground capitalize">{context.role}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-56">
                <DropdownMenuGroup>
                <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                {workspaces.map((ws) => (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => {
                      closeOnMobile()
                      router.push(`/w/${ws.slug}`)
                    }}
                    className="justify-between"
                  >
                    <span className="truncate">{ws.name}</span>
                    {ws.id === context.id ? <Check className="size-3.5" /> : null}
                  </DropdownMenuItem>
                ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/onboarding?new=1")}>
                  <Plus />
                  New workspace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`${base}/settings`)}>
                  <Settings />
                  Workspace settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive(item.url, item.exact)}
                    tooltip={item.title}
                    render={<Link href={item.url} onClick={closeOnMobile} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {item.badge ? (
                    <SidebarMenuBadge className="bg-brand text-white">{item.badge > 99 ? "99+" : item.badge}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupAction title="New project" onClick={() => setProjectDialogOpen(true)}>
            <Plus />
            <span className="sr-only">New project</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {activeProjects.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">No active projects yet.</p>
              ) : (
                activeProjects.slice(0, 12).map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      size="sm"
                      isActive={isActive(`${base}/projects/${project.slug}`)}
                      render={<Link href={`${base}/projects/${project.slug}`} onClick={closeOnMobile} />}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          project.status === "in_progress"
                            ? "bg-brand"
                            : project.status === "planned"
                              ? "bg-sky-500"
                              : "bg-muted-foreground/40",
                        )}
                      />
                      <span className="truncate">{project.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
              {activeProjects.length > 12 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton size="sm" render={<Link href={`${base}/projects`} />}>
                    <span className="text-muted-foreground">View all projects</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive(`${base}/ai`)}
                  tooltip="AI assistant"
                  render={<Link href={`${base}/ai`} onClick={closeOnMobile} />}
                >
                  <Sparkles className="text-brand" />
                  <span>AI assistant</span>
                  <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px] group-data-[collapsible=icon]:hidden">
                    Soon
                  </Badge>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive(`${base}/settings`)}
                  tooltip="Settings"
                  render={<Link href={`${base}/settings`} onClick={closeOnMobile} />}
                >
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive(`${base}/profile`)}
                  tooltip="Profile"
                  render={<Link href={`${base}/profile`} onClick={closeOnMobile} />}
                >
                  <UserRound />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col">
          <SignOutButton />
          <ThemeToggle />
        </div>
      </SidebarFooter>
      <SidebarRail />

      <ProjectFormDialog
        mode="create"
        workspaceId={context.id}
        slug={context.slug}
        members={members}
        currentUserId={context.userId}
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
      />
    </Sidebar>
  )
}
