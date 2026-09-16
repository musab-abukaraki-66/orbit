import type { Metadata } from "next"
import { Inbox } from "lucide-react"

import { getNotifications } from "@/lib/notifications/data"
import { requireWorkspace } from "@/lib/workspaces/context"
import { EmptyState } from "@/components/empty-state"
import { NotificationList } from "@/components/inbox/notification-list"
import { LiveRefresh } from "@/components/realtime/use-live-refresh"

export const metadata: Metadata = { title: "Inbox" }

export default async function InboxPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const context = await requireWorkspace(slug)
  const notifications = await getNotifications(context.id)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <LiveRefresh channelKey={`inbox-${context.userId}`} subscriptions={[{ table: "notifications", filter: `user_id=eq.${context.userId}` }]} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-muted-foreground">Assignments, mentions, comments and invitations — only the things that involve you.</p>
      </div>
      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border">
          <EmptyState icon={Inbox} title="Inbox is quiet" description="You'll be notified here when someone assigns you a task, mentions you, or comments on your work." />
        </div>
      ) : (
        <NotificationList slug={slug} workspaceId={context.id} notifications={notifications} />
      )}
    </div>
  )
}
