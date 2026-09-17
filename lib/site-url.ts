// Absolute origin for links that leave the app: auth email redirects,
// invitation and welcome emails, OG metadata.
//
// NEXT_PUBLIC_SITE_URL is the explicit answer and wins. On Vercel,
// VERCEL_PROJECT_PRODUCTION_URL is the stable production hostname, while
// VERCEL_URL is the per-deployment hostname (a new one per deploy) and is only
// a fallback so preview deployments still link to themselves. Both Vercel
// values are bare hostnames without a scheme.
export function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return stripTrailingSlash(withProtocol(explicit))

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (productionUrl) return `https://${stripTrailingSlash(productionUrl)}`

  const deploymentUrl = process.env.VERCEL_URL?.trim()
  if (deploymentUrl) return `https://${stripTrailingSlash(deploymentUrl)}`

  return "http://127.0.0.1:3000"
}

function withProtocol(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "")
}
