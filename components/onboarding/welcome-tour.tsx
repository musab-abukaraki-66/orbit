"use client"

import * as React from "react"
import {
  ArrowRight,
  Home,
  Kanban,
  Plus,
  Sparkles,
  Users,
} from "lucide-react"

import { completeOnboardingTour } from "@/lib/onboarding/actions"
import { cn } from "@/lib/utils"
import { CreateBoardDialog } from "@/components/create-board-dialog"
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog"
import { OrbitMark } from "@/components/orbit-mark"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

const TOTAL_STEPS = 3

export function WelcomeTour({
  firstName,
  workspaceId,
}: {
  firstName: string
  workspaceId: string | null
}) {
  const [open, setOpen] = React.useState(true)
  const [step, setStep] = React.useState(0)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [, startTransition] = React.useTransition()

  // Persist once, whether the user finishes, skips, or presses Escape. The
  // dialog closes immediately; the metadata write completes in the background.
  const finish = React.useCallback(
    (then?: () => void) => {
      setOpen(false)
      startTransition(async () => {
        await completeOnboardingTour()
        then?.()
      })
    },
    [],
  )

  const isLast = step === TOTAL_STEPS - 1

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) finish()
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden p-0 sm:max-w-lg"
          aria-describedby={undefined}
        >
          <div className="relative flex h-40 items-center justify-center overflow-hidden bg-linear-to-br from-brand/20 via-brand/5 to-transparent sm:h-44">
            <div
              aria-hidden="true"
              className="absolute -top-16 left-1/2 size-56 -translate-x-1/2 rounded-full bg-brand/15 blur-3xl"
            />
            <StepArt step={step} />
          </div>

          <div
            key={step}
            className="flex flex-col gap-5 p-6 pt-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2 motion-safe:duration-200"
          >
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Step {step + 1} of {TOTAL_STEPS}
              </p>
              {step === 0 ? (
                <>
                  <DialogTitle className="text-xl font-semibold tracking-tight">
                    Welcome to Orbit, {firstName}
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed">
                    Orbit is where your team plans and tracks work together.
                    Tasks live on boards, boards live in workspaces, and
                    everyone on your team sees the same picture in real time.
                  </DialogDescription>
                </>
              ) : null}
              {step === 1 ? (
                <>
                  <DialogTitle className="text-xl font-semibold tracking-tight">
                    Find your way around
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed">
                    Everything you need is in the sidebar on the left.
                  </DialogDescription>
                  <ul className="mt-1 flex flex-col gap-2">
                    <NavHint
                      icon={Home}
                      title="Home"
                      text="Your dashboard: an overview of workspaces and boards."
                    />
                    <NavHint
                      icon={Kanban}
                      title="Boards"
                      text="Every board in your current workspace, in one place."
                    />
                    <NavHint
                      icon={Users}
                      title="Team"
                      text="Invite teammates by email and manage their roles."
                    />
                  </ul>
                </>
              ) : null}
              {step === 2 ? (
                <>
                  <DialogTitle className="text-xl font-semibold tracking-tight">
                    Boards are where the work happens
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed">
                    A board is a set of columns — Backlog, Todo, In Progress,
                    Done — that you fill with task cards. Drag a card between
                    columns to move it forward. Every new board comes with
                    these columns ready to go.
                  </DialogDescription>
                  {!workspaceId ? (
                    <p className="mt-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      Boards live inside a workspace, so we&apos;ll set one up
                      first — it only takes a name.
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-3 sm:justify-start">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => finish()}
                >
                  Skip tour
                </Button>
                <StepDots step={step} />
              </div>

              <div className="flex items-center gap-2 sm:justify-end">
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep((current) => current - 1)}
                  >
                    Back
                  </Button>
                ) : null}
                {isLast ? (
                  <Button
                    type="button"
                    onClick={() => finish(() => setCreateOpen(true))}
                    className="bg-brand text-white hover:bg-brand/90"
                  >
                    <Plus />
                    {workspaceId
                      ? "Create your first board"
                      : "Create a workspace"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setStep((current) => current + 1)}
                  >
                    Continue
                    <ArrowRight />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {workspaceId ? (
        <CreateBoardDialog
          workspaceId={workspaceId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      ) : (
        <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </>
  )
}

function StepDots({ step }: { step: number }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-1.5">
      {Array.from({ length: TOTAL_STEPS }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all duration-200",
            index === step ? "w-5 bg-brand" : "w-1.5 bg-muted-foreground/30",
          )}
        />
      ))}
    </div>
  )
}

function NavHint({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  text: string
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-background text-brand ring-1 ring-border">
        <Icon className="size-4" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{text}</span>
      </span>
    </li>
  )
}

function StepArt({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="relative flex flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-background/80 text-brand shadow-sm ring-1 ring-border">
          <OrbitMark className="size-9" />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
          <Sparkles className="size-3.5 text-brand" />
          Let&apos;s get you set up
        </span>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="flex w-56 flex-col gap-1.5 rounded-xl bg-background/80 p-2 shadow-sm ring-1 ring-border">
        {[
          { icon: Home, label: "Home", active: true },
          { icon: Kanban, label: "Boards", active: false },
          { icon: Users, label: "Team", active: false },
        ].map(({ icon: Icon, label, active }) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex w-64 gap-1.5 rounded-xl bg-background/80 p-2 shadow-sm ring-1 ring-border sm:w-72">
      {["Backlog", "Todo", "In Progress", "Done"].map((column, index) => (
        <div
          key={column}
          className="flex flex-1 flex-col gap-1 rounded-md bg-muted/60 p-1.5"
        >
          <span className="truncate text-[10px] font-medium text-muted-foreground">
            {column}
          </span>
          {Array.from({ length: [2, 1, 2, 1][index] }, (_, card) => (
            <span
              key={card}
              className={cn(
                "h-3.5 rounded-sm bg-background ring-1 ring-border",
                index === 2 && card === 0 && "ring-brand/60",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
