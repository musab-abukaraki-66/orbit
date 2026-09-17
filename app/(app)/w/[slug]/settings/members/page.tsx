import type { Metadata } from "next"

import { getPendingInvitations, getWorkspaceMembers } from "@/lib/members/data"
import { isEmailConfigured } from "@/lib/resend/client"
import { requireWorkspace } from "@/lib/workspaces/context"
import { InviteMemberDialog } from "@/components/members/invite-member-dialog"
import { MembersList } from "@/components/members/members-list"
import { PendingInvitations } from "@/components/members/pending-invitations"
import { LiveRefresh } from "@/components/realtime/use-live-refresh"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Members" }

export default async function MembersSettingsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ invite?: string }> }) {
  const { slug } = await params
  const { invite } = await searchParams
  const context = await requireWorkspace(slug)
  const [members, invitations] = await Promise.all([getWorkspaceMembers(context.id), context.isAdmin ? getPendingInvitations(context.id) : Promise.resolve([])])
  const emailConfigured = isEmailConfigured()

  return (
    <div className="flex flex-col gap-6">
      <LiveRefresh channelKey={`members-${context.id}`} subscriptions={[{ table: "workspace_memberships", filter: `workspace_id=eq.${context.id}` }]} />
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>{members.length} {members.length === 1 ? "person" : "people"} in {context.name}. Owners and admins manage members; everyone can work on any project.</CardDescription>
          </div>
          {context.isAdmin ? <InviteMemberDialog workspaceId={context.id} slug={slug} role={context.role} autoOpen={invite === "1"} emailConfigured={emailConfigured} /> : null}
        </CardHeader>
        <CardContent>
          <MembersList slug={slug} workspaceId={context.id} members={members} currentUserId={context.userId} currentRole={context.role} />
        </CardContent>
      </Card>

      {context.isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>Links expire after 14 days. {emailConfigured ? "Resend the email with a fresh link, or revoke it." : "Revoke an invitation and create a new one to issue a fresh link."}</CardDescription>
          </CardHeader>
          <CardContent>
            <PendingInvitations slug={slug} invitations={invitations} emailConfigured={emailConfigured} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
