import { AtSign, CheckCircle2, MessageSquare, UserRoundPlus, Wifi } from "lucide-react"

import { cn } from "@/lib/utils"
import { StatusDot } from "@/components/items/meta"

// Static, aria-hidden previews of the two surfaces that answer "what is
// everyone doing?": the Pulse page and the inbox. Sample data only.

const PEOPLE = [
  { initials: "AK", name: "Ana K.", working: "WEB-12 Brand refresh", status: "violet", when: "2m ago", mine: false },
  { initials: "M", name: "You", working: "WEB-15 Responsive navigation", status: "violet", when: "just now", mine: true },
  { initials: "SK", name: "Sam K.", working: "WEB-14 Migrate blog posts", status: "violet", when: "18m ago", mine: false },
  { initials: "LB", name: "Lena B.", working: "Nothing in progress", status: "slate", when: "1h ago", mine: false },
]

const NOTIFICATIONS = [
  { icon: AtSign, text: "Ana mentioned you in WEB-15", when: "1m", unread: true },
  { icon: CheckCircle2, text: "Sam moved WEB-9 to Done", when: "12m", unread: true },
  { icon: MessageSquare, text: "Lena commented on WEB-17", when: "40m", unread: false },
  { icon: UserRoundPlus, text: "Sam joined Acme Digital", when: "2h", unread: false },
]

export function CollabVisual({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("relative select-none", className)}>
      <div className="absolute -inset-6 rounded-[2.5rem] bg-brand/10 blur-3xl" />
      <div className="relative grid gap-3 sm:grid-cols-[1.35fr_1fr]">
        <div className="overflow-hidden rounded-xl border bg-card shadow-xl ring-1 ring-foreground/5">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-[11px] font-semibold">Pulse · Who&apos;s working on what</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
              <Wifi className="size-2.5" />
              <span className="size-1 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
              Live
            </span>
          </div>
          <ul className="divide-y">
            {PEOPLE.map((person) => (
              <li key={person.name} className="flex items-center gap-2.5 px-3 py-2">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground",
                    person.mine && "bg-brand/15 text-brand ring-1 ring-brand",
                  )}
                >
                  {person.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium">{person.name}</p>
                  <p className="flex items-center gap-1.5 truncate text-[10px] text-muted-foreground">
                    <StatusDot color={person.status} className="size-1.5" />
                    {person.working}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[9px] text-muted-foreground">{person.when}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card shadow-xl ring-1 ring-foreground/5">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-[11px] font-semibold">Inbox</span>
            <span className="rounded-full bg-brand px-1.5 text-[9px] font-medium text-white">2</span>
          </div>
          <ul className="divide-y">
            {NOTIFICATIONS.map((note) => (
              <li key={note.text} className="flex items-start gap-2 px-3 py-2">
                <note.icon className={cn("mt-0.5 size-3.5 shrink-0", note.unread ? "text-brand" : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[10px] leading-snug", note.unread ? "font-medium" : "text-muted-foreground")}>{note.text}</p>
                </div>
                <span className="shrink-0 font-mono text-[9px] text-muted-foreground">{note.when}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
