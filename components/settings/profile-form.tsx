"use client"

import { useActionState } from "react"

import { updateProfile, type ProfileState } from "@/lib/profile/actions"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ProfileForm({ slug, fullName, email }: { slug: string; fullName: string; email: string }) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(updateProfile.bind(null, slug), undefined)
  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-name">Full name</Label>
        <Input id="profile-name" name="fullName" defaultValue={fullName} required minLength={1} maxLength={80} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={email} readOnly className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Email changes aren&apos;t available yet.</p>
      </div>
      {state?.ok === false && state.message ? <Alert>{state.message}</Alert> : null}
      {state?.ok ? <Alert variant="success">{state.message}</Alert> : null}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
      </div>
    </form>
  )
}
