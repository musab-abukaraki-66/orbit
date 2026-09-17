export function deriveKey(name: string) {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean)
  let key = words.length >= 2 ? words.slice(0, 3).map((w) => w[0]).join("") : (words[0]?.slice(0, 3) ?? "WS")
  key = key.toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!/^[A-Z]/.test(key)) key = `W${key}`
  if (key.length < 2) key = `${key}S`
  return key.slice(0, 5)
}
