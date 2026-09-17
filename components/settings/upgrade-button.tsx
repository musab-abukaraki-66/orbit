"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function UpgradeButton() {
  const [clicked, setClicked] = React.useState(false)
  return (
    <div className="flex flex-col gap-2">
      <Button className="w-full bg-brand text-white hover:bg-brand/90" onClick={() => setClicked(true)}>
        <Sparkles />
        Upgrade to Pro
      </Button>
      {clicked ? <Alert variant="info">Pro isn&apos;t available yet — we&apos;ll let you know when checkout opens. You keep everything for free until then.</Alert> : null}
    </div>
  )
}
