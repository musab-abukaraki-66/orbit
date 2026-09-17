import type { Metadata } from "next"
import Link from "next/link"
import { AtSign, Bell, Mail, MessageSquare, UserPlus, ArrowRightLeft, Users } from "lucide-react"

import { getUnreadCount } from "@/lib/notifications/data"
import { requireWorkspace } from "@/lib/workspaces/context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Notifications" }

const RULES = [
  { icon: UserPlus, title: "Assigned to you", text: "When someone assigns you a task, or creates one with you as the assignee." },
  { icon: AtSign, title: "Mentioned", text: "When a teammate @mentions you in a comment." },
  { icon: MessageSquare, title: "Comments on your work", text: "New comments on tasks you created or are assigned to." },
  { icon: ArrowRightLeft, title: "Status changes", text: "When a task you created or own moves to a different status." },
  { icon: Users, title: "Invitations & joins", text: "When you're invited to a workspace, or someone accepts your invitation." },
]

export default async function NotificationSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const context = await requireWorkspace(slug)
  const unread = await getUnreadCount(context.id)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>In-app notifications</CardTitle>
            <CardDescription>Orbit only notifies you about things that involve you. Nothing here creates noise for the whole team.</CardDescription>
          </div>
          <Button variant="outline" render={<Link href={`/w/${slug}/inbox`} />}>
            <Bell />
            Open inbox {unread ? <Badge className="ml-1 bg-brand text-white">{unread}</Badge> : null}
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {RULES.map((rule) => (
              <li key={rule.title} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <rule.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{rule.title}</p>
                  <p className="text-xs text-muted-foreground">{rule.text}</p>
                </div>
                <Badge variant="secondary">Always on</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            Email digests
            <Badge variant="secondary">Coming soon</Badge>
          </CardTitle>
          <CardDescription>A daily summary of what changed while you were away. Orbit stays fully usable without email — invitations work through shareable links.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
