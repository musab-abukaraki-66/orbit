"use client"

import * as React from "react"
import { useActionState } from "react"

import { createProject, updateProject, type FormState } from "@/lib/projects/actions"
import { PROJECT_STATUS_META, type ProjectStatus } from "@/lib/projects/meta"
import { memberLabel } from "@/lib/members/format"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"

type Member = { id: string; full_name: string | null; email: string | null }

type Props = {
  slug: string
  members: Member[]
  currentUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
} & (
  | { mode: "create"; workspaceId: string }
  | {
      mode: "edit"
      project: { id: string; name: string; description: string | null; status: ProjectStatus; lead_id: string | null; target_date: string | null }
    }
)

export function ProjectFormDialog(props: Props) {
  const { slug, members, currentUserId, open, onOpenChange } = props
  const action =
    props.mode === "create"
      ? createProject.bind(null, props.workspaceId, slug)
      : updateProject.bind(null, props.project.id, slug)
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined)
  const submittedRef = React.useRef(false)

  React.useEffect(() => {
    if (submittedRef.current && !pending && state?.ok) {
      submittedRef.current = false
      onOpenChange(false)
    }
  }, [pending, state, onOpenChange])

  const project = props.mode === "edit" ? props.project : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {project
              ? "Update the project details."
              : "Projects hold the work for one outcome — a launch, a redesign, a client. Give it a lead and a target date."}
          </DialogDescription>
        </DialogHeader>
        <form
          action={formAction}
          onSubmit={() => {
            submittedRef.current = true
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input id="project-name" name="name" defaultValue={project?.name ?? ""} placeholder="e.g. Website redesign" autoFocus required maxLength={120} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-description">Description</Label>
            <Textarea id="project-description" name="description" defaultValue={project?.description ?? ""} rows={3} placeholder="What's the goal? What does done look like?" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-status">Status</Label>
              <NativeSelect
                id="project-status"
                name="status"
                defaultValue={project?.status ?? "planned"}
              >
                {(Object.keys(PROJECT_STATUS_META) as ProjectStatus[]).map((value) => (
                  <option key={value} value={value}>
                    {PROJECT_STATUS_META[value].label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-lead">Lead</Label>
              <NativeSelect
                id="project-lead"
                name="lead_id"
                defaultValue={project?.lead_id ?? currentUserId}
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {memberLabel(member)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-target">Target date</Label>
            <Input id="project-target" name="target_date" type="date" defaultValue={project?.target_date ?? ""} />
          </div>
          {state?.ok === false && state.message ? <Alert>{state.message}</Alert> : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? (project ? "Saving…" : "Creating…") : project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
