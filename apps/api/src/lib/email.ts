/**
 * Thin email abstraction.
 *
 * Priority order:
 *   1. Resend  — set RESEND_API_KEY
 *   2. SMTP    — set SMTP_HOST (+ optional SMTP_PORT, SMTP_USER, SMTP_PASS)
 *   3. Console — logs the email body (development fallback)
 *
 * All callers receive the same interface regardless of transport.
 */

import nodemailer from 'nodemailer'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text: string
}

const FROM = process.env['EMAIL_FROM'] ?? 'BotStudio <noreply@botstudio.uk>'

async function sendViaResend(opts: EmailOptions): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env['RESEND_API_KEY']}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}

async function sendViaSMTP(opts: EmailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env['SMTP_HOST'],
    port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
    secure: process.env['SMTP_SECURE'] === 'true',
    auth: process.env['SMTP_USER']
      ? { user: process.env['SMTP_USER'], pass: process.env['SMTP_PASS'] ?? '' }
      : undefined,
  })
  await transporter.sendMail({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text })
}

function sendViaConsole(opts: EmailOptions): void {
  console.log('\n─── [EMAIL — no transport configured] ──────────────────')
  console.log(`To:      ${opts.to}`)
  console.log(`Subject: ${opts.subject}`)
  console.log(`\n${opts.text}\n`)
  console.log('─────────────────────────────────────────────────────────\n')
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  if (process.env['RESEND_API_KEY']) {
    await sendViaResend(opts)
    return
  }
  if (process.env['SMTP_HOST']) {
    await sendViaSMTP(opts)
    return
  }
  sendViaConsole(opts)
}

// ── Typed email templates ────────────────────────────────────────────────────

export function passwordResetEmail(opts: { to: string; resetUrl: string; displayName?: string }): EmailOptions {
  const name = opts.displayName ?? 'there'
  return {
    to: opts.to,
    subject: 'Reset your BotStudio password',
    text: `Hi ${name},\n\nClick the link below to reset your password (valid for 1 hour):\n\n${opts.resetUrl}\n\nIf you didn't request this, you can ignore this email.\n\nBotStudio`,
    html: `<p>Hi ${name},</p>
<p>Click the button below to reset your password. This link is valid for <strong>1 hour</strong>.</p>
<p style="margin:24px 0"><a href="${opts.resetUrl}" style="background:#8b5cf6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p>
<p style="color:#6b7280;font-size:13px">Or copy this URL into your browser:<br/><code>${opts.resetUrl}</code></p>
<p style="color:#6b7280;font-size:13px">If you didn't request a password reset, you can safely ignore this email.</p>`,
  }
}

export function inviteEmail(opts: { to: string; inviteUrl: string; invitedBy: string; workspaceName: string; role: string }): EmailOptions {
  return {
    to: opts.to,
    subject: `You've been invited to ${opts.workspaceName} on BotStudio`,
    text: `Hi,\n\n${opts.invitedBy} has invited you to join ${opts.workspaceName} as ${opts.role}.\n\nAccept your invite here:\n${opts.inviteUrl}\n\nThis link expires in 7 days.\n\nBotStudio`,
    html: `<p>Hi,</p>
<p><strong>${opts.invitedBy}</strong> has invited you to join <strong>${opts.workspaceName}</strong> as <strong>${opts.role}</strong>.</p>
<p style="margin:24px 0"><a href="${opts.inviteUrl}" style="background:#8b5cf6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Accept invite</a></p>
<p style="color:#6b7280;font-size:13px">Or copy this URL:<br/><code>${opts.inviteUrl}</code></p>
<p style="color:#6b7280;font-size:13px">This invitation expires in 7 days.</p>`,
  }
}
