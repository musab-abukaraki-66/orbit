"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, UserPlus } from "lucide-react"

import { createInvitation } from "@/lib/team/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function InviteMemberDialog({
  teamId,
  canInviteAdmins,
  trigger,
}: {
  teamId: string
  canInviteAdmins: boolean
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<"member" | "admin">("member")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const result = await createInvitation(teamId, email, role)
    if (!result.ok) {
      setError(result.message ?? "Could not send the invitation.")
      setPending(false)
      return
    }
    setPending(false)
    setEmail("")
    setRole("member")
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      {trigger ? (
        React.cloneElement(
          trigger as React.ReactElement<{ onClick?: () => void }>,
          { onClick: () => setOpen(true) },
        )
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          <UserPlus />
          Invite member
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              They&apos;ll get an email with a link to join this team.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="off"
                placeholder="teammate@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button type="button" variant="outline" className="justify-between" />
                  }
                >
                  <span className="capitalize">{role}</span>
                  <ChevronDown className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => setRole("member")}
                    className="justify-between"
                  >
                    Member
                    {role === "member" ? <Check className="size-4" /> : null}
                  </DropdownMenuItem>
                  {canInviteAdmins ? (
                    <DropdownMenuItem
                      onClick={() => setRole("admin")}
                      className="justify-between"
                    >
                      Admin
                      {role === "admin" ? <Check className="size-4" /> : null}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-xs text-muted-foreground">
                Admins can manage members and invitations. Owners are only
                created when a team is set up.
              </p>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {pending ? "Sending…" : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}