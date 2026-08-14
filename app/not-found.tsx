import Link from "next/link"

import { OrbitMark } from "@/components/orbit-mark"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden px-4 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-3xl"
      />
      <OrbitMark className="size-12 text-brand" />
      <div className="flex flex-col items-center gap-3">
        <p className="font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          error 404
        </p>
        <h1 className="max-w-xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          This page drifted out of orbit.
        </h1>
        <p className="max-w-sm text-muted-foreground">
          It may have moved, been renamed, or never existed here in the first
          place.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          Return home
        </Link>
        <Link
          href="/app"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Open the app
        </Link>
      </div>
    </div>
  )
}
