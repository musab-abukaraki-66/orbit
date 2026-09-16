export function memberLabel(member: { full_name: string | null; email: string | null }) {
  return member.full_name?.trim() || member.email || "Unknown"
}

export function initialsOf(name: string | null | undefined) {
  const clean = (name ?? "").trim()
  if (!clean) return "?"
  const parts = clean.split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase()
}
