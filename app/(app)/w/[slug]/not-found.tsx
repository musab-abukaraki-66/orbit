import Link from "next/link"
import { Compass } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function WorkspaceNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Compass className="size-6 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">This project, task or page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      </div>
      <Button variant="outline" render={<Link href="/app" />}>
        Back to your workspace
      </Button>
    </div>
  )
}
