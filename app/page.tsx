import Link from "next/link"

import { OrbitHeroVisual } from "@/components/orbit-hero-visual"
import { OrbitMark } from "@/components/orbit-mark"
import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"

const features = [
  {
    title: "Boards",
    description:
      "Drag-and-drop Kanban boards that keep every task in view, from backlog to done.",
  },
  {
    title: "Workspaces",
    description:
      "Organize projects across teams and workspaces with a structure that scales.",
  },
  {
    title: "Realtime sync",
    description:
      "Updates land instantly. Your team always sees the latest state, together.",
  },
  {
    title: "AI assistant",
    description:
      "Smart writing and summaries help your team move faster and stay aligned.",
  },
]

export default function LandingPage() {
  return (
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
              className={buttonVariants({ size: "sm" })}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col gap-6">
              <span className="w-fit rounded-full border bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
                v0.1 · project management for teams
              </span>
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Plan, track, and ship together —{" "}
                <span className="text-brand">in perfect orbit</span>.
              </h1>
              <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                Orbit brings your boards, tasks, and teammates into one focused
                workspace. Everything your team needs, moving in sync.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/app"
                  className={buttonVariants({ size: "lg" })}
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

        <section id="features" className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Everything in one place.
              </h2>
              <p className="mt-3 text-muted-foreground">
                A focused set of tools that keep your team aligned from kickoff
                to launch.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border bg-card p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <OrbitMark className="size-4 text-brand" />
            <span>Orbit</span>
          </div>
          <p className="font-mono text-xs">
            built with Next.js · plan · track · ship
          </p>
        </div>
      </footer>
    </div>
  )
}
