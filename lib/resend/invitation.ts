import { Resend } from "resend"

const resendApiKey = process.env.RESEND_API_KEY

const resend = resendApiKey ? new Resend(resendApiKey) : null

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Orbit <onboarding@resend.dev>"

function isConfigured() {
  return Boolean(resend && resendApiKey)
}

export async function sendInvitationEmail({
  to,
  inviterName,
  teamName,
  role,
  acceptUrl,
}: {
  to: string
  inviterName: string
  teamName: string
  role: "admin" | "member"
  acceptUrl: string
}): Promise<boolean> {
  if (!isConfigured()) {
    console.log(
      `[dev] RESEND_API_KEY not set — invitation email skipped for ${to}. Invite URL: ${acceptUrl}`,
    )
    return false
  }

  const roleLabel = role === "admin" ? "an admin" : "a member"

  await resend!.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${inviterName} invited you to ${teamName} on Orbit`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827;line-height:1.6">
        <p style="font-size:15px;margin:0 0 16px;">Hi there,</p>
        <p style="margin:0 0 16px;">
          ${inviterName} invited you to join <strong>${teamName}</strong> on Orbit as ${roleLabel}.
        </p>
        <p style="margin:0 0 24px;">
          <a href="${acceptUrl}"
             style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;padding:10px 18px;font-weight:600;">
            Accept the invitation
          </a>
        </p>
        <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
          This link expires in 7 days. If you weren't expecting this invite, you can ignore this email.
        </p>
        <p style="margin:0;color:#9ca3af;font-size:12px;">— The Orbit team</p>
      </div>
    `,
  })
  return true
}
