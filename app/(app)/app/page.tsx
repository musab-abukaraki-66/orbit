import { ArrowUpRight, Kanban, Plus, Sparkles } from "lucide-react"

import { getFirstTeam, requireUser } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const stats = [
  { label: "Open tasks", value: "0" },
  { label: "In progress", value: "0" },
  { label: "Done this week", value: "0" },
]

export default async function AppHomePage() {
  const user = await requireUser()
  const team = await getFirstTeam(user.id)

  const fullName = String(user.user_metadata?.full_name ?? "").trim()
  const firstName = fullName.split(/\s+/)[0] || "there"

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Working in{" "}
          <span className="font-medium text-foreground">{team?.name}</span>.
          Create a board to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-2xl font-semibold tabular-nums">
                {stat.value}
              </span>
              <span className="text-sm text-muted-foreground">
                {stat.label}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Kanban className="size-4 text-muted-foreground" />
            Your boards
          </CardTitle>
          <CardDescription>
            Boards keep tasks organized in lanes you control.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Plus className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">No boards yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create your first board to start planning work with your team.
            </p>
          </div>
          <Button>
            Create board
            <ArrowUpRight className="size-4" />
          </Button>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent className="flex items-center gap-3">
          <Sparkles className="size-4 text-brand" />
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-sm font-medium">AI features coming soon</p>
            <p className="text-sm text-muted-foreground">
              Task writing and sprint summaries are on the roadmap.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
