"use client"

import * as React from "react"
import { useActionState } from "react"

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

export type NameFormState =
  | {
      ok: boolean
      message?: string
    }
  | undefined

export function NameFormDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  submitLabel,
  pendingLabel = submitLabel,
  initialValue = "",
  action,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  label: string
  placeholder?: string
  submitLabel: string
  pendingLabel?: string
  initialValue?: string
  action: (
    prevState: NameFormState,
    formData: FormData,
  ) => Promise<NameFormState>
  onSuccess?: () => void
}) {
  const [state, formAction, pending] = useActionState<NameFormState, FormData>(
    action,
    undefined,
  )
  const submittedRef = React.useRef(false)

  React.useEffect(() => {
    if (submittedRef.current && !pending) {
      submittedRef.current = false
      if (state?.ok) {
        onOpenChange(false)
        onSuccess?.()
      }
    }
  }, [pending, state, onOpenChange, onSuccess])

  const inputId = `name-input-${title.replace(/\s+/g, "-").toLowerCase()}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <form
          action={formAction}
          onSubmit={() => {
            submittedRef.current = true
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={inputId}>{label}</Label>
            <Input
              id={inputId}
              name="name"
              placeholder={placeholder}
              defaultValue={initialValue}
              autoFocus
              required
            />
          </div>
          {state?.ok === false ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
