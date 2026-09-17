import { emailShell, escapeHtml, sendEmail, type SendResult } from "@/lib/resend/client"

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
}): Promise<SendResult> {
  const roleLabel = role === "admin" ? "an admin" : "a member"
  const inviter = escapeHtml(inviterName)
  const team = escapeHtml(teamName)
  const html = emailShell(`
    <p style="font-size:15px;margin:0 0 16px;">Hi there,</p>
    <p style="margin:0 0 16px;">${inviter} invited you to join <strong>${team}</strong> on Orbit as ${roleLabel}.</p>
    <p style="margin:0 0 24px;">
      <a href="${acceptUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;padding:10px 18px;font-weight:600;">Accept the invitation</a>
    </p>
    <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Sign up or sign in with this email address (${escapeHtml(to)}) and you'll land straight in ${team}. The link expires in 14 days.</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">If the button doesn't work, paste this into your browser:<br><span style="word-break:break-all">${acceptUrl}</span></p>
    <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">If you weren't expecting this invite, you can ignore this email.</p>`)
  const text = `${inviterName} invited you to join ${teamName} on Orbit as ${roleLabel}.\n\nAccept the invitation: ${acceptUrl}\n\nSign up or sign in with ${to}. The link expires in 14 days.`
  return sendEmail({ to, subject: `${inviterName} invited you to ${teamName} on Orbit`, html, text })
}
