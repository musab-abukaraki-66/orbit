import type { ReactNode } from "react"
import Link from "next/link"

import { OrbitMark } from "@/components/orbit-mark"
import { ThemeToggle } from "@/components/theme-toggle"

export default function InviteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <OrbitMark className="size-7 text-brand" />
          <span className="text-lg font-semibold tracking-tight">Orbit</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
        {children}
      </main>
    </div>
  )
}