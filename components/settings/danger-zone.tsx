"use client"

import * as React from "react"

import { leaveWorkspace } from "@/lib/members/actions"
import { deleteWorkspace } from "@/lib/workspaces/actions"
import type { WorkspaceContext } from "@/lib/workspaces/context"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function DangerZone({ workspace }: { workspace: WorkspaceContext }) {
  const [leaveOpen, setLeaveOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>Danger zone</CardTitle>
        <CardDescription>These actions can&apos;t be undone.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Leave workspace</p>
            <p className="text-xs text-muted-foreground">You&apos;ll lose access to {workspace.name}. {workspace.isOwner ? "Transfer ownership first if you're the only owner." : ""}</p>
          </div>
          <Button variant="outline" onClick={() => setLeaveOpen(true)}>Leave</Button>
        </div>
        {workspace.isOwner ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium">Delete workspace</p>
              <p className="text-xs text-muted-foreground">Deletes every project, task, comment and member. Permanent.</p>
            </div>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete workspace</Button>
          </div>
        ) : null}
      </CardContent>
      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Leave workspace"
        description={`Leave ${workspace.name}? An admin will need to invite you again to come back.`}
        confirmLabel="Leave workspace"
        pendingLabel="Leaving…"
        onConfirm={async () => {
          const result = await leaveWorkspace(workspace.id)
          return result.ok ? undefined : { ok: false, message: result.message }
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete workspace"
        description={`This permanently deletes ${workspace.name} and everything in it for every member.`}
        confirmLabel="Delete everything"
        onConfirm={async () => {
          const result = await deleteWorkspace(workspace.id)
          return result?.ok === false ? { ok: false, message: result.message } : undefined
        }}
      />
    </Card>
  )
}
