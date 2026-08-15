import type { Metadata } from "next"
import { Users } from "lucide-react"

import { requireUser, getActiveTeam } from "@/lib/auth/session"
import {
  listMembers,
  listInvitations,
} from "@/lib/team/actions"
import { getMyTeamRole } from "@/lib/team/data"
import { InviteMemberDialog } from "@/components/team/invite-member-dialog"
import { MembersList } from "@/components/team/members-list"
import { PendingInvitations } from "@/components/team/pending-invitations"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Team",
}

export default async function TeamPage() {
  const user = await requireUser()
  const team = await getActiveTeam(user.id)
  if (!team) {
    return null
  }

  const [myRole, membersResult, invitationsResult] = await Promise.all([
    getMyTeamRole(team.id),
    listMembers(team.id),
    listInvitations(team.id),
  ])

  const canManage = myRole === "owner" || myRole === "admin"
  const canInviteAdmins = myRole === "owner"
  const members = membersResult.ok ? (membersResult.members ?? []) : []
  const invitations = invitationsResult.ok
    ? (invitationsResult.invitations ?? [])
    : []

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Users className="size-6 text-muted-foreground" />
            {team.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage who has access to this team and what they can do.
          </p>
        </div>
        {canManage ? (
          <InviteMemberDialog
            teamId={team.id}
            canInviteAdmins={canInviteAdmins}
            trigger={<Button>Invite member</Button>}
          />
        ) : null}
      </div>

      <PendingInvitations invitations={invitations} canManage={canManage} />

      <MembersList
        teamId={team.id}
        myRole={myRole}
        myUserId={user.id}
        members={members}
      />
    </div>
  )
}