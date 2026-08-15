"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Crown, MoreHorizontal, ShieldAlert, UserRound, Trash2 } from "lucide-react"

import {
  changeMemberRole,
  removeMember,
  type MemberPayload,
  type TeamRole,
} from "@/lib/team/actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function initialsFor(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  const first = parts[0]?.[0] ?? email[0] ?? "?"
  return first.toUpperCase()
}

const ROLE_META: Record<
  TeamRole,
  { label: string; icon: typeof UserRound; variant: "secondary" | "outline" | "default" }
> = {
  owner: { label: "Owner", icon: Crown, variant: "default" },
  admin: { label: "Admin", icon: ShieldAlert, variant: "secondary" },
  member: { label: "Member", icon: UserRound, variant: "outline" },
}

function RoleBadge({ role }: { role: TeamRole }) {
  const meta = ROLE_META[role]
  const Icon = meta.icon
  return (
    <Badge variant={meta.variant}>
      <Icon />
      {meta.label}
    </Badge>
  )
}

function MemberRow({
  member,
  teamId,
  myRole,
  myUserId,
  canManage,
}: {
  member: MemberPayload
  teamId: string
  myRole: TeamRole
  myUserId: string
  canManage: boolean
}) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [removeOpen, setRemoveOpen] = React.useState(false)
  const isMe = member.userId === myUserId

  const name = member.fullName || member.email || "Unknown member"

  async function runRole(newRole: TeamRole) {
    setBusy(true)
    setError(null)
    const result = await changeMemberRole(teamId, member.userId, newRole)
    if (!result.ok) {
      setError(result.message ?? "Could not change role.")
      setBusy(false)
      return
    }
    setBusy(false)
    router.refresh()
  }

  const canRemove =
    myRole === "owner" ? member.role !== "owner" : member.role === "member"
  const canAssignAdmin = myRole === "owner" && member.role !== "owner"
  const canDemoteAdmin = myRole === "owner" && member.role === "admin"
  const showMenu =
    canManage && !isMe && (canRemove || canAssignAdmin || canDemoteAdmin)

  return (
    <>
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>
            {initialsFor(member.fullName ?? "", member.email ?? "")}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{name}</span>
            {isMe ? (
              <span className="text-xs text-muted-foreground">(you)</span>
            ) : null}
          </div>
          {member.email ? (
            <span className="truncate text-xs text-muted-foreground">
              {member.email}
            </span>
          ) : null}
        </div>
        <RoleBadge role={member.role} />
        {showMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Manage ${name}`}
                />
              }
            >
              <span className="sr-only">Manage member</span>
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canAssignAdmin ? (
                <DropdownMenuItem
                  onClick={() => runRole("admin")}
                  disabled={busy}
                >
                  <ShieldAlert />
                  Make admin
                </DropdownMenuItem>
              ) : null}
              {canDemoteAdmin ? (
                <DropdownMenuItem
                  onClick={() => runRole("member")}
                  disabled={busy}
                >
                  Make member
                </DropdownMenuItem>
              ) : null}
              {canRemove ? (
                <>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setError(null)
                      setRemoveOpen(true)
                    }}
                  >
                    <Trash2 />
                    Remove
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Remove ${name}?`}
        description="They'll immediately lose access to this team and its boards."
        confirmLabel="Remove member"
        pendingLabel="Removing…"
        onConfirm={() => removeMember(teamId, member.userId)}
        onSuccess={() => {
          setRemoveOpen(false)
          router.refresh()
        }}
      />
    </>
  )
}

export function MembersList({
  teamId,
  myRole,
  myUserId,
  members,
}: {
  teamId: string
  myRole: TeamRole | null
  myUserId: string
  members: MemberPayload[]
}) {
  const canManage = myRole === "owner" || myRole === "admin"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-4 text-muted-foreground" />
          Team members
        </CardTitle>
        <CardDescription>
          {members.length} member{members.length === 1 ? "" : "s"} in this team.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {members.map((member) => (
          <MemberRow
            key={member.userId}
            member={member}
            teamId={teamId}
            myRole={myRole ?? "member"}
            myUserId={myUserId}
            canManage={canManage}
          />
        ))}
      </CardContent>
    </Card>
  )
}