const COLUMN_COLORS: Record<string, string> = {
  Backlog: "bg-muted-foreground/70",
  Todo: "bg-sky-500",
  "In Progress": "bg-brand",
  Done: "bg-emerald-500",
}

export function getColumnDotClass(name: string): string {
  return COLUMN_COLORS[name] ?? "bg-muted-foreground/70"
}
