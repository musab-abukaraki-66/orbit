import { Resend } from "resend"

import { getSiteOrigin } from "@/lib/site-url"

const resendApiKey = process.env.RESEND_API_KEY

const resend = resendApiKey ? new Resend(resendApiKey) : null

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Orbit <onboarding@resend.dev>"

function isConfigured() {
  return Boolean(resend && resendApiKey)
}

export async function sendWelcomeEmail(to: string, fullName?: string) {
  if (!isConfigured()) return

  const firstName = fullName?.trim().split(/\s+/)[0] || "there"

  await resend!.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Welcome to Orbit",
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827;line-height:1.6">
        <p style="font-size:15px;margin:0 0 16px;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;">
          Welcome to Orbit — your team's home for planning, tracking, and shipping work together.
        </p>
        <p style="margin:0 0 24px;">
          <a href="${getSiteOrigin()}"
             style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;padding:10px 18px;font-weight:600;">
            Create your team
          </a>
        </p>
        <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
          Create a team, set up a workspace, and invite your teammates to get moving.
        </p>
        <p style="margin:0;color:#9ca3af;font-size:12px;">— The Orbit team</p>
      </div>
    `,
  })
}
