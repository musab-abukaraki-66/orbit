import type { Metadata } from "next"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  Command,
  FolderKanban,
  Kanban,
  KeyRound,
  Layers,
  MessageSquare,
  Sparkles,
  UserRoundPlus,
  Users,
  Zap,
} from "lucide-react"

import { OrbitHeroVisual } from "@/components/orbit-hero-visual"
import { CollabVisual } from "@/components/landing/collab-visual"
import { LandingMotion } from "@/components/landing/landing-motion"
import { OrbitMark } from "@/components/orbit-mark"
import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const description =
  "Orbit is a free, collaborative project management app for small teams: workspaces, projects, realtime boards, tasks with comments and activity, an inbox, and a Pulse page that shows who is working on what."

export const metadata: Metadata = {
  title: { absolute: "Orbit — Collaborative project management for small teams" },
  description,
  openGraph: {
    type: "website",
    siteName: "Orbit",
    title: "Orbit — Collaborative project management for small teams",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Orbit — Collaborative project management for small teams",
    description,
  },
}

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#collaboration", label: "Collaboration" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
]

const features = [
  {
    title: "Workspaces and roles",
    icon: Layers,
    description:
      "One workspace per team. Owners and admins manage members, settings and invitations; every member can work on any task.",
  },
  {
    title: "Projects with a pulse",
    icon: FolderKanban,
    description:
      "Each project has a lead, status, health and target date. Progress is computed from its tasks; short updates replace status meetings.",
  },
  {
    title: "Board and list views",
    icon: Kanban,
    description:
      "Drag tasks between statuses with the pointer or keyboard. Switch to a sortable list of the same project any time.",
  },
  {
    title: "Tasks with context",
    icon: MessageSquare,
    description:
      "Keys like WEB-15, priority, assignee, labels and due dates. Comments with @mentions and a full activity timeline in the detail panel.",
  },
  {
    title: "Pulse and My work",
    icon: Activity,
    description:
      "Pulse shows who is working on what across the workspace. My work lists everything assigned to you, overdue first.",
  },
  {
    title: "Inbox",
    icon: Bell,
    description:
      "Notifications for assignments, mentions, comments, status changes and new members. Mark them read and jump straight to the task.",
  },
  {
    title: "Realtime everywhere",
    icon: Zap,
    description:
      "Boards, lists, members, inbox and Pulse update in every open browser, and resync when a tab wakes up or reconnects.",
  },
  {
    title: "Search and ⌘K",
    icon: Command,
    description:
      "Search tasks, projects and people from the header. Press ⌘K to jump to any project or task, or to create a new one.",
  },
  {
    title: "Secure invitations",
    icon: KeyRound,
    description:
      "Invite by link or email. Tokens are hashed, expire after 14 days and can be revoked. Invitees join with the invited address.",
  },
]

const collaborationPoints = [
  {
    icon: Activity,
    title: "Status is visible, not requested",
    description: "Pulse lists each member's in-progress tasks and last activity, so nobody has to ask \"where are you with this?\".",
  },
  {
    icon: MessageSquare,
    title: "Conversations stay on the task",
    description: "Comment with @mentions where the work is. Every change lands in the activity timeline and the right inboxes.",
  },
  {
    icon: Users,
    title: "Permissions that stay out of the way",
    description: "Owner, admin and member roles decide who manages people and settings. Everyone can move, edit and finish tasks.",
  },
]

const steps = [
  {
    num: "01",
    icon: Layers,
    title: "Create a workspace",
    description:
      "Sign up with an email and password, name your workspace and start with an optional sample project. Statuses and labels are ready to use.",
  },
  {
    num: "02",
    icon: UserRoundPlus,
    title: "Invite your team",
    description:
      "Send a link or an email. Teammates sign up with the invited address and land in the workspace with the role you chose.",
  },
  {
    num: "03",
    icon: Kanban,
    title: "Run projects on the board",
    description:
      "Create projects, add tasks, drag them across statuses, comment and post updates. Everyone sees it change live.",
  },
]

const freeFeatures = [
  "Unlimited members, projects and tasks",
  "Realtime boards and lists",
  "Comments, activity and notifications",
  "Pulse, My work, search and ⌘K",
  "Invite by link or email",
]

const faq = [
  {
    q: "What is Orbit?",
    a: "A collaborative project and work management app. A workspace holds your team, projects group tasks, and boards and lists show the same tasks in different ways. Everything updates in real time.",
  },
  {
    q: "Who is it for?",
    a: "Small teams that want a shared, always-current picture of their work without a heavy tool. Product teams, agencies, studios and side projects with a handful of collaborators.",
  },
  {
    q: "Is Orbit free?",
    a: "Yes. Every feature that exists today is free with no member or project limits. A Pro plan is shown in the app for preview only; payments are not enabled.",
  },
  {
    q: "Is the AI assistant real?",
    a: "Not yet. Orbit AI is a preview screen inside the app so you can see where it will live. No AI provider is connected and the answers it shows are placeholders.",
  },
  {
    q: "Do I need an email service to invite people?",
    a: "No. Every invitation is a link you can copy and share. If the workspace has email delivery configured the link is also emailed.",
  },
  {
    q: "Who can see my data?",
    a: "Only members of your workspace. Access is enforced in the database with row-level security, not just in the interface. Passwords are handled by Supabase Auth and can be reset from the sign-in page.",
  },
]

export default function LandingPage() {
  return (
    <LandingMotion>
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5" aria-label="Orbit home">
              <OrbitMark className="size-7 text-brand" />
              <span className="text-lg font-semibold tracking-tight">Orbit</span>
            </Link>
            <nav aria-label="Page sections" className="hidden items-center gap-1 lg:flex">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
                Sign in
              </Link>
              <Link
                href="/signup"
                data-magnetic
                className={cn(buttonVariants({ size: "sm" }), "transition-shadow hover:shadow-lg hover:shadow-brand/25")}
              >
                Get started
              </Link>
            </div>
          </div>
        </header>

        <main>
          <section data-hero-section className="relative mx-auto w-full max-w-6xl overflow-hidden px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-16">
            <div data-hero-copy className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
              <p className="font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Free · project management for small teams
              </p>
              <h1 data-hero-title className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                See who&apos;s working on what — <span className="text-brand">without asking</span>.
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                Orbit keeps your team&apos;s projects, tasks and conversations in one workspace that updates in real time. Status lives on the board, not in chat.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/signup"
                  data-magnetic
                  className={cn(buttonVariants({ size: "lg" }), "transition-shadow hover:shadow-lg hover:shadow-brand/25")}
                >
                  Create a free workspace
                  <ArrowRight />
                </Link>
                <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  Sign in
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">No credit card. Invite your team with a link.</p>
            </div>
            <div className="mt-12 sm:mt-16">
              <OrbitHeroVisual />
            </div>
          </section>

          <section id="features" className="scroll-mt-16 border-t bg-muted/30">
            <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
              <div data-reveal className="mb-12 max-w-2xl">
                <p className="font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">what you get</p>
                <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                  Everything a small team needs to run its work.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Workspaces, projects, tasks and the views that show what is happening. Nothing that needs a training session.
                </p>
              </div>
              <div data-reveal-group className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm transition-colors duration-150 hover:border-foreground/15 hover:shadow-md"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <feature.icon className="size-4" />
                    </span>
                    <h3 className="text-base font-semibold">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="collaboration" className="scroll-mt-16 overflow-hidden">
            <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
              <div data-reveal className="flex flex-col gap-8">
                <div>
                  <p className="font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">collaboration</p>
                  <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                    Built for working together, live.
                  </h2>
                  <p className="mt-3 text-muted-foreground">
                    Move a card, post a comment or change an assignee and every teammate with the workspace open sees it in the same second.
                  </p>
                </div>
                <ul className="flex flex-col gap-5">
                  {collaborationPoints.map((point) => (
                    <li key={point.title} className="flex gap-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <point.icon className="size-4" />
                      </span>
                      <div>
                        <h3 className="font-semibold">{point.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{point.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div data-reveal>
                <CollabVisual />
              </div>
            </div>
          </section>

          <section id="how" className="scroll-mt-16 border-t bg-muted/30">
            <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
              <div data-reveal className="mb-12 max-w-2xl">
                <p className="font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">how it works</p>
                <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                  From sign-up to a shared board in a few minutes.
                </h2>
              </div>
              <ol data-reveal-group className="grid gap-5 sm:grid-cols-3">
                {steps.map((step) => (
                  <li
                    key={step.num}
                    className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm transition-colors duration-150 hover:border-foreground/15 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <step.icon className="size-4" />
                      </span>
                      <span className="font-mono text-xs font-medium text-brand">{step.num}</span>
                    </div>
                    <h3 className="text-base font-semibold">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="pricing" className="scroll-mt-16">
            <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
              <div data-reveal className="mb-12 max-w-2xl">
                <p className="font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">pricing</p>
                <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Free. No plan to pick.</h2>
                <p className="mt-3 text-muted-foreground">
                  Everything Orbit does today is included. Two things are shown in the app as previews and are labelled as such.
                </p>
              </div>
              <div data-reveal-group className="grid gap-5 lg:grid-cols-3">
                <div className="flex flex-col gap-5 rounded-xl border border-brand/40 bg-card p-6 shadow-sm lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Free</h3>
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">Current</span>
                  </div>
                  <p>
                    <span className="text-4xl font-semibold tracking-tight">$0</span>
                    <span className="ml-1.5 text-sm text-muted-foreground">forever</span>
                  </p>
                  <ul className="flex flex-col gap-2 text-sm">
                    {freeFeatures.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "mt-auto w-full")}>
                    Create a free workspace
                  </Link>
                </div>
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                      <Sparkles className="size-4 text-brand" />
                      Orbit AI
                    </h3>
                    <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">Preview</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    A screen in the app shows where summaries and drafting will live. No AI provider is connected; the replies are placeholders, not answers about your work.
                  </p>
                </div>
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Pro plan</h3>
                    <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">Coming soon</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    The billing page lists a planned Pro tier so teams know what is ahead. Payments are not enabled and nothing in Orbit is gated behind it.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="faq" className="scroll-mt-16 border-t bg-muted/30">
            <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
              <div data-reveal className="mb-10">
                <p className="font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">faq</p>
                <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Questions, answered plainly.</h2>
              </div>
              <div data-reveal-group className="flex flex-col gap-3">
                {faq.map((entry) => (
                  <details key={entry.q} className="group rounded-xl border bg-card px-5 py-4 shadow-sm open:border-foreground/15">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold outline-none [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-ring rounded-md">
                      {entry.q}
                      <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{entry.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden border-t">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-3xl"
            />
            <div data-reveal className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6 sm:py-32">
              <p className="font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">get started</p>
              <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">Set up your workspace in a minute.</h2>
              <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                Create a workspace, invite your team with a link and see your first project on a live board.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/signup"
                  data-magnetic
                  className={cn(buttonVariants({ size: "lg" }), "transition-shadow hover:shadow-lg hover:shadow-brand/25")}
                >
                  Create a free workspace
                  <ArrowRight />
                </Link>
                <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  Sign in
                </Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6">
            <div className="flex flex-col justify-between gap-8 sm:flex-row">
              <div className="flex max-w-xs flex-col gap-3">
                <Link href="/" className="flex items-center gap-2.5" aria-label="Orbit home">
                  <OrbitMark className="size-5 text-brand" />
                  <span className="font-semibold">Orbit</span>
                </Link>
                <p className="text-sm text-muted-foreground">
                  Collaborative project management for small teams. Workspaces, projects, realtime boards and a Pulse on who is doing what.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-8 text-sm sm:gap-16">
                <div className="flex flex-col gap-2">
                  <p className="font-medium">Product</p>
                  {navLinks.map((link) => (
                    <a key={link.href} href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </a>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <p className="font-medium">Account</p>
                  <Link href="/signup" className="text-muted-foreground transition-colors hover:text-foreground">
                    Create account
                  </Link>
                  <Link href="/login" className="text-muted-foreground transition-colors hover:text-foreground">
                    Sign in
                  </Link>
                  <Link href="/forgot-password" className="text-muted-foreground transition-colors hover:text-foreground">
                    Reset password
                  </Link>
                </div>
              </div>
            </div>
            <p className="border-t pt-6 font-mono text-xs text-muted-foreground">
              © {new Date().getFullYear()} Orbit · Built with Next.js and Supabase
            </p>
          </div>
        </footer>
      </div>
    </LandingMotion>
  )
}
