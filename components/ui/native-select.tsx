import * as React from "react"

import { cn } from "@/lib/utils"

// Themed native <select>. The popup list is drawn by the browser, so it
// relies on `color-scheme` (set on :root/.dark in globals.css) to render
// dark options in dark mode; option colors are pinned as a fallback.
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-8 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none transition-[color,box-shadow]",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        "dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground",
        className,
      )}
      {...props}
    />
  )
}

export { NativeSelect }
