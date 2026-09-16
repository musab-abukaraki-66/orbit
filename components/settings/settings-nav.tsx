"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Building2, CreditCard, ListChecks, Tags, UserRound, Users } from "lucide-react"

import { cn } from "@/lib/utils"

export function SettingsNav({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const pathname = usePathname()
  const base = `/w/${slug}/settings`
  const items = [
    { href: base, label: "General", icon: Building2, exact: true },
    { href: `${base}/members`, label: "Members", icon: Users },
    { href: `${base}/labels`, label: "Labels", icon: Tags },
    { href: `${base}/statuses`, label: "Statuses", icon: ListChecks },
    { href: `${base}/notifications`, label: "Notifications", icon: Bell },
    { href: `${base}/billing`, label: "Billing", icon: CreditCard },
    { href: `/w/${slug}/profile`, label: "Profile", icon: UserRound },
  ]
  void isAdmin
  return (
    <nav aria-label="Settings" className="flex gap-1 overflow-x-auto lg:w-52 lg:flex-col">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
