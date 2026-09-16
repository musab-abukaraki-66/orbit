import Link from "next/link"
import {
  ChevronDown,
  Columns3,
  Layers,
  MousePointerClick,
  Sparkles,
  SquareKanban,
  Users,
  Wifi,
  Zap,
} from "lucide-react"

import { OrbitHeroVisual } from "@/components/orbit-hero-visual"
import { LandingMotion } from "@/components/landing/landing-motion"
import { OrbitMark } from "@/components/orbit-mark"
import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const miniBoard = [
  {
    name: "Backlog",
    dot: "bg-muted-foreground/70",
    count: 4,
    cards: ["Research competitor onboarding flows", "Draft PRD for M7 tiers"],
  },
  {
    name: "Todo",
    dot: "bg-sky-500",
    count: 5,
    cards: ["Keyboard shortcuts for navigation", "Persist theme choice"],
  },
  {
    name: "In Progress",
    dot: "bg-brand",
    count: 5,
    cards: [
      "Drag-and-drop between columns",
      "Realtime board subscription",
    ],
  },
]

const features = [
  {
    title: "Boards",
    icon: SquareKanban,
    emphasis: true,
    description:
      "Drag-and-drop Kanban boards that keep every task in view, from backlog to done.",
  },
  {
    title: "Workspaces",
    icon: Layers,
    emphasis: false,
    description:
      "Projects, people and roles in one workspace. Invite teammates with a link — no email service required.",
  },
  {
    title: "Realtime sync",
    icon: Zap,
    emphasis: false,
    description:
      "Updates land instantly. Your team always sees the latest state, together.",
  },
  {
    title: "AI assistant",
    icon: Sparkles,
    emphasis: false,
    description:
      "Coming soon: summaries and drafting inside your tasks. Preview the experience in the app today.",
  },
]

const captions: Record<string, string> = {
  Boards: "drag & drop lanes",
  Workspaces: "structure that scales",
  "Realtime sync": "no refresh required",
  "AI assistant": "coming soon",
}

const steps = [
  {
    num: "01",
    icon: Users,
    title: "Create a workspace",
    description:
      "Name it, invite the people who ship with you with a link, and land on a board with sample tasks in under a minute.",
  },
  {
    num: "02",
    icon: Columns3,
    title: "Organize into projects",
    description:
      "Every project gets a board and a list. Shape the columns to match how your work actually moves.",
  },
  {
    num: "03",
    icon: MousePointerClick,
    title: "Drag, assign, ship",
    description:
      "Move cards and watch updates land in real time. Tag an owner, set a priority, push work out the door.",
  },
]

function renderCardDetail(title: string) {
  if (title === "Workspaces") {
    return (
      <>
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-brand/10 font-mono text-[9px] font-semibold text-brand">
              O
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium">
                Orbit Workspace
              </p>
              <p className="truncate font-mono text-[9px] text-muted-foreground">
                current team
              </p>
            </div>
          </div>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="flex size-4 shrink-0 items-center justify-center rounded bg-muted font-mono text-[8px] text-muted-foreground">
            M
          </span>
          <span className="text-[10px] text-muted-foreground">
            2 more workspaces
          </span>
        </div>
      </>
    )
  }
  if (title === "Realtime sync") {
    return (
      <>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
            <Wifi className="size-3" />
            <span className="size-1 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
            Live
          </span>
          <span className="font-mono text-[9px] text-muted-foreground">
            just now - 3 peers
          </span>
        </div>
        <div className="mt-2.5 flex items-end gap-1">
          <span className="h-2 w-1 rounded-full bg-brand/40" />
          <span className="h-3 w-1 rounded-full bg-brand/50" />
          <span className="h-4 w-1 animate-pulse rounded-full bg-brand motion-reduce:animate-none" />
          <span className="h-2.5 w-1 rounded-full bg-brand/40" />
          <span className="h-3 w-1 rounded-full bg-brand/50" />
        </div>
      </>
    )
  }
  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2 py-1.5">
        <Sparkles className="size-3 shrink-0 text-brand" />
        <span className="truncate text-[10px] text-muted-foreground">
          Summarize this week&apos;s sprint...
        </span>
        <span className="ml-auto h-3 w-px animate-pulse bg-foreground/60 motion-reduce:animate-none" />
      </div>
      <p className="mt-2 font-mono text-[9px] text-muted-foreground">
        draft - refine - ship
      </p>
    </>
  )
}

export default function LandingPage() {
  return (
    <LandingMotion>
      <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <OrbitMark className="size-7 text-brand" />
            <span className="text-lg font-semibold tracking-tight">Orbit</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/app"
              data-magnetic
              className={cn(
                buttonVariants({ size: "sm" }),
                "transition-shadow hover:shadow-lg hover:shadow-brand/25",
              )}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section
          data-hero-section
          className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24"
        >
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div data-hero-copy className="flex flex-col gap-6">
              <p className="font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Orbit v0.1.0 · project management for teams
              </p>
              <h1
                data-hero-title
                className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
              >
                Plan, track, and ship together —{" "}
                <span className="text-brand">in perfect orbit</span>.
              </h1>
              <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                Orbit brings your projects, tasks, and teammates into one focused
                workspace. Everything your team needs, moving in sync.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/app"
                  data-magnetic
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "transition-shadow hover:shadow-lg hover:shadow-brand/25",
                  )}
                >
                  Open the app
                </Link>
                <a
                  href="#features"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  See features
                </a>
              </div>
            </div>
            <OrbitHeroVisual />
          </div>
        </section>

        <section id="features" data-features-section className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div data-features-copy className="mb-12 max-w-2xl">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Everything your team needs, nothing it doesn&apos;t.
              </h2>
              <p className="mt-3 text-muted-foreground">
                A focused set of tools that keep your team aligned from kickoff
                to launch.
              </p>
            </div>
            <div data-features-grid className="grid gap-5 sm:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div
                    key={feature.title}
                    data-feature-card
                    className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-colors duration-150 hover:border-foreground/15 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                          feature.emphasis
                            ? "bg-brand/10 text-brand"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <h3 className="text-base font-semibold">
                        {feature.title}
                      </h3>
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground/80">
                        {captions[feature.title]}
                      </span>
                    </div>
                    <p className="leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                    {feature.emphasis ? (
                      <div className="mt-auto -mx-1 border-t pt-4">
                        <div className="flex min-w-0 items-start gap-2">
                          {miniBoard.map((column) => (
                            <div
                              key={column.name}
                              className="min-w-0 flex-1 rounded-lg bg-muted/40 p-2"
                            >
                              <div className="flex items-center gap-1.5 px-0.5 pb-1.5">
                                <span
                                  className={cn(
                                    "size-1.5 shrink-0 rounded-full",
                                    column.dot,
                                  )}
                                />
                                <span className="truncate text-[10px] font-medium">
                                  {column.name}
                                </span>
                                <span className="ml-auto font-mono text-[9px] text-muted-foreground">
                                  {column.count}
                                </span>
                              </div>
                              {column.cards.map((card) => (
                                <div
                                  key={card}
                                  className="mb-1 min-w-0 rounded-md border border-border/60 bg-card px-1.5 py-1 shadow-xs"
                                >
                                  <span className="block truncate text-[10px] font-medium">
                                    {card}
                                  </span>
                                </div>
                              ))}
                              <div className="mt-1.5 h-2 rounded-md bg-muted/70" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-auto border-t pt-4">
                        {renderCardDetail(feature.title)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section
          id="how"
          data-how-section
          className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24"
        >
          <div data-how-copy className="mb-12 max-w-2xl">
            <p className="font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              the flow
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              From empty workspace to shipping, in three steps.
            </h2>
            <p className="mt-3 text-muted-foreground">
              No setup gauntlet. Orbit is shaped around the way focused teams
              already work.
            </p>
          </div>
          <ol data-how-steps className="grid gap-5 sm:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <li
                  key={step.num}
                  data-how-step
                  className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm transition-colors duration-150 hover:border-foreground/15 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <span className="font-mono text-xs font-medium text-brand">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  <p className="leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              )
            })}
          </ol>
        </section>

        <section
          data-cta-section
          className="relative overflow-hidden border-t bg-muted/30"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-3xl"
          />
          <div
            data-cta-content
            className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6 sm:py-32"
          >
            <p className="font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              ready when you are
            </p>
            <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Start planning in perfect orbit.
            </h2>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
              Your first board is a click away. Free while we&apos;re in beta —
              no credit card.
            </p>
            <Link
              href="/app"
              data-magnetic
              className={cn(
                buttonVariants({ size: "lg" }),
                "transition-shadow hover:shadow-lg hover:shadow-brand/25",
              )}
            >
              Open the app
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <OrbitMark className="size-5 text-brand" />
            <span className="font-semibold text-foreground">Orbit</span>
            <span className="hidden font-mono text-xs sm:block">
              kanban for teams that ship
            </span>
          </div>
          <p className="font-mono text-xs">
            © {new Date().getFullYear()} Orbit · plan · track · ship
          </p>
        </div>
      </footer>
      </div>
    </LandingMotion>
  )
}
