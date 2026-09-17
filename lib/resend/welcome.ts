import { emailShell, escapeHtml, sendEmail } from "@/lib/resend/client"
import { getSiteOrigin } from "@/lib/site-url"

export async function sendWelcomeEmail(to: string, fullName?: string) {
  const firstName = escapeHtml(fullName?.trim().split(/\s+/)[0] || "there")
  const origin = getSiteOrigin()
  const html = emailShell(`
    <p style="font-size:15px;margin:0 0 16px;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;">Welcome to Orbit — your team's home for planning, tracking and shipping work together.</p>
    <p style="margin:0 0 24px;">
      <a href="${origin}/app" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;padding:10px 18px;font-weight:600;">Open Orbit</a>
    </p>
    <p style="margin:0;color:#6b7280;font-size:13px;">Create a workspace, add a project and invite your teammates with a link.</p>`)
  const text = `Hi ${firstName},\n\nWelcome to Orbit. Open ${origin}/app to create a workspace, add a project and invite your teammates.`
  // Best effort: never block sign-up on email.
  await sendEmail({ to, subject: "Welcome to Orbit", html, text })
}
