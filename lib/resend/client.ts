import { Resend } from "resend"

// Transactional email through Resend's free tier (HTTP API; the same API key
// also works as the SMTP password for Supabase Auth's custom SMTP). Fully
// optional: without RESEND_API_KEY every flow still works via shareable links.
//
// Free-tier rules worth knowing:
// - Until a domain is verified in Resend, the only allowed sender is
//   onboarding@resend.dev and mail is only delivered to the Resend account's
//   own email address. Verifying a domain (free) lifts both limits.
// - 100 emails/day, 3,000/month.

const apiKey = process.env.RESEND_API_KEY?.trim()

export const resend = apiKey ? new Resend(apiKey) : null

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL?.trim() || "Orbit <onboarding@resend.dev>"

export function isEmailConfigured() {
  return Boolean(resend)
}

export type SendResult = { sent: true } | { sent: false; reason: string }

// Resend's SDK returns { data, error } instead of throwing; both paths end up
// here so callers get one honest answer.
export async function sendEmail(input: { to: string; subject: string; html: string; text: string }): Promise<SendResult> {
  if (!resend) return { sent: false, reason: "not_configured" }
  try {
    const { error } = await resend.emails.send({ from: FROM_EMAIL, ...input })
    if (error) {
      console.error(`[email] Resend rejected "${input.subject}" to ${input.to}: ${error.name}: ${error.message}`)
      return { sent: false, reason: humanizeResendError(error.message) }
    }
    return { sent: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[email] Failed to send "${input.subject}" to ${input.to}: ${message}`)
    return { sent: false, reason: humanizeResendError(message) }
  }
}

function humanizeResendError(message: string) {
  if (/only send testing emails to your own email|verify a domain/i.test(message)) {
    return "Resend's free tier only delivers to the Resend account's own address until a domain is verified."
  }
  if (/api key|unauthorized|401/i.test(message)) return "The Resend API key was rejected."
  if (/domain is not verified|not verified/i.test(message)) return "The sender domain isn't verified in Resend yet."
  if (/rate|429|quota/i.test(message)) return "Resend's sending limit was reached for now."
  return "The email service returned an error."
}

export function emailShell(body: string) {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827;line-height:1.6">
      ${body}
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">— Orbit</p>
    </div>`
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)
}
