import * as React from "react"

import { cn } from "@/lib/utils"

export function OrbitMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-5", className)}
    >
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <ellipse
        cx="12"
        cy="12"
        rx="9.5"
        ry="4"
        transform="rotate(-30 12 12)"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.55"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="9.5"
        ry="4"
        transform="rotate(35 12 12)"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <circle cx="20.5" cy="6.5" r="1.4" fill="currentColor" opacity="0.9" />
    </svg>
  )
}
