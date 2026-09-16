import type { Metadata } from "next"
import { Check, Sparkles } from "lucide-react"

import { getWorkspaceMembers } from "@/lib/members/data"
import { getProjects } from "@/lib/projects/data"
import { requireWorkspace } from "@/lib/workspaces/context"
import { UpgradeButton } from "@/components/settings/upgrade-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Billing" }

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Everything a small team needs to stay in sync.",
    features: ["Unlimited members", "Unlimited projects and tasks", "Realtime boards", "Comments, activity and notifications", "Invite by link"],
    current: true,
  },
  {
    name: "Pro",
    price: "$8",
    period: "per member / month",
    tagline: "For teams that want more control and insight.",
    features: ["Everything in Free", "Orbit AI summaries and drafts", "Email digests", "Guest access for clients", "Priority support"],
    current: false,
  },
]

export default async function BillingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const context = await requireWorkspace(slug)
  const [members, projects] = await Promise.all([getWorkspaceMembers(context.id), getProjects(context.id, true)])

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current plan <Badge variant="secondary">Free</Badge>
          </CardTitle>
          <CardDescription>{context.name} is on the Free plan. {members.length} member{members.length === 1 ? "" : "s"}, {projects.length} project{projects.length === 1 ? "" : "s"}. No payment method on file.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PLANS.map((plan) => (
          <Card key={plan.name} className={cn(!plan.current && "border-brand/40")}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {plan.name}
                  {!plan.current ? <Sparkles className="size-4 text-brand" /> : null}
                </span>
                {plan.current ? <Badge variant="secondary">Current</Badge> : <Badge variant="outline">Coming soon</Badge>}
              </CardTitle>
              <CardDescription>{plan.tagline}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p>
                <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>
                <span className="ml-1 text-sm text-muted-foreground">{plan.period}</span>
              </p>
              <ul className="flex flex-col gap-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              {plan.current ? null : <UpgradeButton />}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Payments aren&apos;t enabled yet. Everything in Orbit stays free while Pro is in preview.</p>
    </div>
  )
}
