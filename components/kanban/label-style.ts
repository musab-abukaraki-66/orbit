// Fixed palette for team labels. Uses the same Tailwind hue family as Orbit's
// existing tokens (priority icons, column dots) — no new design tokens.
export const LABEL_COLORS = [
  "slate",
  "rose",
  "amber",
  "emerald",
  "sky",
  "violet",
  "indigo",
  "teal",
] as const

export type LabelColor = (typeof LABEL_COLORS)[number]

const LABEL_STYLES: Record<
  LabelColor,
  { swatch: string; chip: string }
> = {
  slate: {
    swatch: "bg-slate-500",
    chip: "border-slate-500/25 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
  rose: {
    swatch: "bg-rose-500",
    chip: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  amber: {
    swatch: "bg-amber-500",
    chip: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  emerald: {
    swatch: "bg-emerald-500",
    chip: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  sky: {
    swatch: "bg-sky-500",
    chip: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  violet: {
    swatch: "bg-violet-500",
    chip: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  indigo: {
    swatch: "bg-indigo-500",
    chip: "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  teal: {
    swatch: "bg-teal-500",
    chip: "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
}

export function getLabelStyle(color: string) {
  return LABEL_STYLES[color as LabelColor] ?? LABEL_STYLES.slate
}

export function isLabelColor(value: string): value is LabelColor {
  return (LABEL_COLORS as readonly string[]).includes(value)
}