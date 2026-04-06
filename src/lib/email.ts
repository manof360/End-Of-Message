// src/lib/email.ts
// Uses Resend API (free tier: 3000 emails/month)
// Sign up at resend.com, create API key, add RESEND_API_KEY to env vars

type EmailOptions = {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey || apiKey === 'placeholder') {
    console.warn(`[Email] RESEND_API_KEY not set — skipping send to: ${to}`)
    console.log(`[Email] Subject: ${subject}`)
    return false
  }

  try {
    const from = process.env.EMAIL_FROM || 'وصيتي <onboarding@resend.dev>'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[Email] Resend error:', data)
      return false
    }

    console.log(`[Email] ✅ Sent to ${to} — ID: ${data.id}`)
    return true
  } catch (err) {
    console.error('[Email] Send failed:', err)
    return false
  }
}
