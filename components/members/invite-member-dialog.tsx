"use client"

import * as React from "react"
import { useActionState } from "react"
import { Check, Copy, Link2, UserPlus } from "lucide-react"

import { inviteMember, type InviteState } from "@/lib/members/actions"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"

export function InviteMemberDialog({ workspaceId, slug, role, autoOpen = false }: { workspaceId: string; slug: string; role: string; autoOpen?: boolean }) {
  const [open, setOpen] = React.useState(autoOpen)
  const [state, formAction, pending] = useActionState<InviteState, FormData>(inviteMember.bind(null, workspaceId, slug), undefined)
  const [copied, setCopied] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)

  React.useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus />
        Invite people
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              Enter their email and we&apos;ll create a private invitation link. Share the link however you like — chat, email, text. No mail server required.
            </DialogDescription>
          </DialogHeader>

          {state?.ok ? (
            <div className="flex flex-col gap-3">
              <Alert variant="success">
                Invitation ready for <strong>{state.email}</strong>.{state.emailed ? " We also emailed it to them." : " Copy the link below and send it to them."}
              </Alert>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-link">Invitation link</Label>
                <div className="flex gap-2">
                  <Input id="invite-link" readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                  <Button type="button" variant="outline" onClick={() => void copy(state.link)} className="shrink-0">
                    {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  <Link2 className="mr-1 inline size-3" />
                  Only someone signing in with {state.email} can accept it. Expires in 14 days.
                </p>
              </div>
            </div>
          ) : null}

          <form ref={formRef} action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">{state?.ok ? "Invite someone else" : "Email address"}</Label>
              <Input id="invite-email" name="email" type="email" placeholder="teammate@company.com" required autoFocus={!state?.ok} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <NativeSelect id="invite-role" name="role" defaultValue="member">
                <option value="member">Member — can work on all projects</option>
                {role === "owner" || role === "admin" ? <option value="admin">Admin — can also manage members and settings</option> : null}
              </NativeSelect>
            </div>
            {state?.ok === false ? <Alert>{state.message}</Alert> : null}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>{state?.ok ? "Done" : "Cancel"}</DialogClose>
              <Button type="submit" disabled={pending}>{pending ? "Creating link…" : "Create invitation"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
