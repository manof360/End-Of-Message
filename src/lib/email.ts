// src/lib/email.ts
type EmailOptions = { to: string; subject: string; html: string }

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey || apiKey === 'placeholder' || apiKey === '') {
    console.warn(`[Email] RESEND_API_KEY not configured — would send to: ${to}`)
    return false
  }

  // IMPORTANT: With Resend free tier, 'from' MUST be a verified sender
  // or a verified domain. Do NOT use Arabic names or display names.
  // Set EMAIL_FROM in environment variables (e.g., no-reply@yourdomain.com)
  const from = process.env.EMAIL_FROM || 'Wasiyati <onboarding@resend.dev>'

  try {
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
      console.error('[Email] Resend API error:', JSON.stringify(data))
      return false
    }

    console.log(`[Email] ✅ Sent successfully to: ${to} | ID: ${data.id}`)
    return true
  } catch (err: any) {
    console.error('[Email] Network/fetch error:', err?.message || err)
    return false
  }
}
