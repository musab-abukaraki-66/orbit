// Only ever redirect to a same-origin path so a crafted `next` can't be used
// as an open redirect.
export function safeNext(raw: FormDataEntryValue | string | null | undefined): string | null {
  const value = String(raw ?? "").trim()
  if (!value.startsWith("/") || value.startsWith("//")) return null
  return value
}
