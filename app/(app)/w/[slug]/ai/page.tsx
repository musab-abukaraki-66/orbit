import type { Metadata } from "next"
import { ListChecks, MessageSquareText, Sparkles, Wand2 } from "lucide-react"

import { requireWorkspace } from "@/lib/workspaces/context"
import { AiPreviewCard } from "@/components/ai/ai-preview-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Orbit AI" }

const FEATURES = [
  { icon: ListChecks, title: "Project summaries", text: "A two-line status of any project: what moved, what's blocked, what's next — generated from real activity." },
  { icon: Wand2, title: "Task drafting", text: "Turn a one-line title into a clear description with acceptance criteria your team can act on." },
  { icon: MessageSquareText, title: "Update drafts", text: "A weekly health update written for the lead to review and post in one click." },
]

export default async function AiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  await requireWorkspace(slug)
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sparkles className="size-6 text-brand" />
          Orbit AI
          <Badge variant="secondary">Coming soon</Badge>
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          An assistant that already knows your projects, tasks and activity — so summaries and drafts are grounded in what your team actually did. This is a preview of the experience; nothing is sent anywhere yet.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-brand/15 text-brand">
                  <f.icon className="size-4" />
                </span>
                {f.title}
              </CardTitle>
              <CardDescription>{f.text}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Try the interface</CardTitle>
          <CardDescription>Ask anything to see how it will feel. Responses are placeholders until AI is enabled for your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <AiPreviewCard />
        </CardContent>
      </Card>
    </div>
  )
}
