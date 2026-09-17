"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Crown, MoreHorizontal, Shield, UserMinus, UserRound } from "lucide-react"

import { changeMemberRole, removeMember, transferOwnership } from "@/lib/members/actions"
import type { MemberRow } from "@/lib/members/data"
import { memberLabel } from "@/lib/members/format"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { UserAvatar } from "@/components/user-avatar"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const RANK = { owner: 3, admin: 2, member: 1 } as const

export function MembersList({
  slug,
  workspaceId,
  members,
  currentUserId,
  currentRole,
}: {
  slug: string
  workspaceId: string
  members: MemberRow[]
  currentUserId: string
  currentRole: "owner" | "admin" | "member"
}) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = React.useState<MemberRow | null>(null)
  const [pendingTransfer, setPendingTransfer] = React.useState<MemberRow | null>(null)
  const myRank = RANK[currentRole]

  async function run(promise: Promise<{ ok: boolean; message?: string }>) {
    setError(null)
    const result = await promise
    if (!result.ok) setError(result.message ?? "Something went wrong.")
    else router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert>{error}</Alert> : null}
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {members.map((member) => {
          const canManage = member.user_id !== currentUserId && myRank >= 2 && RANK[member.role] < myRank
          return (
            <li key={member.user_id} className="flex items-center gap-3 px-4 py-3">
              <UserAvatar name={memberLabel(member)} avatarUrl={member.avatar_url} className="size-8" fallbackClassName="text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {memberLabel(member)}
                  {member.user_id === currentUserId ? <span className="ml-1 text-xs text-muted-foreground">(you)</span> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>
              <Badge variant={member.role === "owner" ? "default" : member.role === "admin" ? "secondary" : "outline"} className={cn("capitalize", member.role === "owner" && "bg-brand text-white")}>
                {member.role === "owner" ? <Crown className="size-3" /> : member.role === "admin" ? <Shield className="size-3" /> : <UserRound className="size-3" />}
                {member.role}
              </Badge>
              {canManage ? (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Manage ${memberLabel(member)}`} />}>
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    {member.role !== "admin" ? (
                      <DropdownMenuItem onClick={() => void run(changeMemberRole(workspaceId, slug, member.user_id, "admin"))}>
                        <Shield />
                        Make admin
                      </DropdownMenuItem>
                    ) : null}
                    {member.role !== "member" ? (
                      <DropdownMenuItem onClick={() => void run(changeMemberRole(workspaceId, slug, member.user_id, "member"))}>
                        <UserRound />
                        Make member
                      </DropdownMenuItem>
                    ) : null}
                    {currentRole === "owner" ? (
                      <DropdownMenuItem onClick={() => setPendingTransfer(member)}>
                        <Crown />
                        Transfer ownership
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setPendingRemove(member)}>
                      <UserMinus />
                      Remove from workspace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="w-7" />
              )}
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => !open && setPendingRemove(null)}
        title="Remove member"
        description={pendingRemove ? `${memberLabel(pendingRemove)} will lose access to this workspace. Their tasks stay but become unassigned.` : ""}
        confirmLabel="Remove"
        pendingLabel="Removing…"
        onConfirm={async () => {
          if (!pendingRemove) return undefined
          const result = await removeMember(workspaceId, slug, pendingRemove.user_id)
          return result.ok ? undefined : { ok: false, message: result.message }
        }}
        onSuccess={() => router.refresh()}
      />
      <ConfirmDialog
        open={pendingTransfer !== null}
        onOpenChange={(open) => !open && setPendingTransfer(null)}
        title="Transfer ownership"
        description={pendingTransfer ? `${memberLabel(pendingTransfer)} becomes the owner and you become an admin. Only the owner can delete the workspace.` : ""}
        confirmLabel="Transfer ownership"
        pendingLabel="Transferring…"
        onConfirm={async () => {
          if (!pendingTransfer) return undefined
          const result = await transferOwnership(workspaceId, slug, pendingTransfer.user_id)
          return result.ok ? undefined : { ok: false, message: result.message }
        }}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
