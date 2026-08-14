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
      <path
        d="M4.81 16.01 A8 5 -26 1 1 19.19 8.99"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path
        d="M19.19 8.99 A8 5 -26 1 0 4.81 16.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="6.39" cy="15.24" r="1.9" fill="currentColor" />
      <circle cx="19.19" cy="8.99" r="1.5" fill="currentColor" />
    </svg>
  )
}
