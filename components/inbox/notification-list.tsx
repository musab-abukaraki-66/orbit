"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AtSign, Bell, CheckCheck, MessageSquare, UserPlus, Users, ArrowRightLeft, Megaphone } from "lucide-react"

import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications/actions"
import type { NotificationRow } from "@/lib/notifications/data"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/components/items/meta"
import { Button } from "@/components/ui/button"

const ICONS = {
  assigned: UserPlus,
  mentioned: AtSign,
  commented: MessageSquare,
  status_changed: ArrowRightLeft,
  invited: Users,
  member_joined: Users,
  project_update: Megaphone,
} as const

export function NotificationList({ slug, workspaceId, notifications }: { slug: string; workspaceId: string; notifications: NotificationRow[] }) {
  const router = useRouter()
  const unread = notifications.filter((n) => !n.read_at).length

  const hrefFor = (n: NotificationRow) => {
    if (n.item?.project?.slug && n.item.key) return `/w/${slug}/projects/${n.item.project.slug}?item=${n.item.key}`
    if (n.kind === "invited" || n.kind === "member_joined") return `/w/${slug}/settings/members`
    if (n.project_id) return `/w/${slug}/projects`
    return `/w/${slug}`
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{unread ? `${unread} unread` : "All caught up"}</span>
        {unread ? (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await markAllNotificationsRead(workspaceId, slug)
              router.refresh()
            }}
          >
            <CheckCheck className="size-3.5" />
            Mark all as read
          </Button>
        ) : null}
      </div>
      <ul className="flex flex-col overflow-hidden rounded-xl border border-border">
        {notifications.map((n) => {
          const Icon = ICONS[n.kind] ?? Bell
          const isUnread = !n.read_at
          return (
            <li key={n.id} className={cn("flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0", isUnread ? "bg-brand/5" : "bg-card")}>
              <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md", isUnread ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground")}>
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={hrefFor(n)}
                  onClick={() => {
                    if (isUnread) void markNotificationRead(n.id, slug)
                  }}
                  className="block text-sm font-medium hover:underline"
                >
                  {n.title}
                </Link>
                {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p> : null}
                <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
              </div>
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                onClick={async () => {
                  await markNotificationRead(n.id, slug, isUnread)
                  router.refresh()
                }}
              >
                {isUnread ? "Mark read" : "Mark unread"}
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
