// src/lib/email.ts
import nodemailer from 'nodemailer'

type EmailOptions = {
  to: string
  subject: string
  html: string
}

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return transporter
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (!process.env.SMTP_HOST) {
    console.warn('[Email] SMTP not configured — skipping send')
    console.log(`[Email] Would have sent to: ${to} | Subject: ${subject}`)
    return
  }

  const t = getTransporter()
  await t.sendMail({
    from: process.env.EMAIL_FROM || 'وصيتي <noreply@wasiyati.com>',
    to,
    subject,
    html,
  })
}
