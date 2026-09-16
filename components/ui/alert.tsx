import * as React from "react"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

import { cn } from "@/lib/utils"

export function Alert({
  variant = "error",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { variant?: "error" | "success" | "info" }) {
  const Icon = variant === "error" ? AlertCircle : variant === "success" ? CheckCircle2 : Info
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        variant === "error" && "border-destructive/40 bg-destructive/10 text-destructive",
        variant === "success" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        variant === "info" && "border-border bg-muted/50 text-muted-foreground",
        className,
      )}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
