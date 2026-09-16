"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"

import { addProjectMember, removeProjectMember } from "@/lib/projects/actions"
import type { ProfileLite } from "@/lib/items/types"
import { memberLabel } from "@/lib/members/format"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function ProjectMembersEditor({
  slug,
  projectId,
  members,
  allProfiles,
  canEdit,
  currentUserId,
}: {
  slug: string
  projectId: string
  members: ProfileLite[]
  allProfiles: ProfileLite[]
  canEdit: boolean
  currentUserId: string
}) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const memberIds = new Set(members.map((m) => m.id))
  const candidates = allProfiles.filter((p) => !memberIds.has(p.id))
  const isMember = memberIds.has(currentUserId)

  async function add(userId: string) {
    const result = await addProjectMember(projectId, slug, userId)
    if (!result.ok) setError(result.message ?? "Could not add member.")
    else router.refresh()
  }
  async function remove(userId: string) {
    const result = await removeProjectMember(projectId, slug, userId)
    if (!result.ok) setError(result.message ?? "Could not remove member.")
    else router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      {members.length === 0 ? <p className="text-sm text-muted-foreground">No members yet.</p> : null}
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-2 text-sm">
          <UserAvatar name={memberLabel(member)} avatarUrl={member.avatar_url} className="size-6" />
          <span className="flex-1 truncate">{memberLabel(member)}</span>
          {canEdit || member.id === currentUserId ? (
            <Button variant="ghost" size="icon-xs" aria-label={`Remove ${memberLabel(member)}`} onClick={() => void remove(member.id)}>
              <X className="size-3" />
            </Button>
          ) : null}
        </div>
      ))}
      <div className="flex gap-2">
        {canEdit && candidates.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <Plus className="size-3.5" />
              Add member
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 min-w-48 overflow-y-auto">
              {candidates.map((profile) => (
                <DropdownMenuItem key={profile.id} onClick={() => void add(profile.id)}>
                  <UserAvatar name={memberLabel(profile)} avatarUrl={profile.avatar_url} className="size-4" fallbackClassName="text-[8px]" />
                  {memberLabel(profile)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {!isMember ? (
          <Button variant="outline" size="sm" onClick={() => void add(currentUserId)}>
            Join project
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
