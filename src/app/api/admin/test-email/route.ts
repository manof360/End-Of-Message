// src/app/api/admin/test-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { to } = await req.json()
  if (!to || !to.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey === 'placeholder' || apiKey === '') {
    return NextResponse.json({
      success: false,
      error: 'RESEND_API_KEY غير موجود في Vercel Environment Variables',
    }, { status: 500 })
  }

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: #1A1208; border-radius: 16px; padding: 32px;">
    <h1 style="color: #D4A017; margin: 0 0 8px; font-size: 22px;">وصيتي ✓</h1>
    <p style="color: #FDF8F0; margin: 0 0 20px; font-size: 14px;">اختبار نظام الإيميل</p>
    <div style="background: rgba(184,134,11,0.15); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="color: #FDF8F0; margin: 0; font-size: 15px;">🎉 نجح اختبار الإيميل!</p>
      <p style="color: rgba(253,248,240,0.6); margin: 8px 0 0; font-size: 12px;">
        التاريخ: ${new Date().toLocaleString('ar-SA')}
      </p>
    </div>
    <p style="color: rgba(253,248,240,0.3); font-size: 11px; margin: 0;">
      Wasiyati v1.1.0 — Test Email
    </p>
  </div>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Wasiyati <onboarding@resend.dev>',
        to,
        subject: '✅ اختبار وصيتي — نظام الإيميل يعمل',
        html,
      }),
    })

    const data = await res.json()
    console.log('[Test Email] Resend response:', JSON.stringify(data))

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: data?.message || data?.name || JSON.stringify(data),
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err: any) {
    console.error('[Test Email] Error:', err)
    return NextResponse.json({
      success: false,
      error: err?.message || 'Network error',
    }, { status: 500 })
  }
}
