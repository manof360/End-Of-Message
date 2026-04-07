// src/app/api/admin/test-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { to } = await req.json()
  if (!to || !to.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #1A1208; color: #FDF8F0; padding: 40px 20px; direction: rtl; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: #2A1F0E; border: 1px solid rgba(184,134,11,0.3); border-radius: 16px; padding: 32px;">
    <h1 style="color: #D4A017; font-size: 24px; margin: 0 0 8px;">وصيتي ✓</h1>
    <h2 style="color: #FDF8F0; font-size: 16px; margin: 0 0 20px; font-weight: 400;">اختبار نظام الإيميل</h2>
    <div style="border-top: 1px solid rgba(184,134,11,0.2); padding-top: 20px;">
      <p style="color: rgba(253,248,240,0.8); line-height: 1.8;">
        🎉 نجح اختبار الإيميل! نظام الإرسال يعمل بشكل صحيح.
      </p>
      <div style="background: rgba(184,134,11,0.1); border-radius: 8px; padding: 16px; margin-top: 16px;">
        <p style="color: #D4A017; font-size: 13px; margin: 0;">
          تاريخ الاختبار: ${new Date().toLocaleString('ar-SA', { dateStyle: 'full', timeStyle: 'short' })}
        </p>
      </div>
    </div>
    <p style="margin-top: 24px; color: rgba(253,248,240,0.3); font-size: 12px;">
      هذه رسالة اختبار من لوحة الإدارة — وصيتي v1.1.0
    </p>
  </div>
</body>
</html>`

  const success = await sendEmail({
    to,
    subject: '✅ اختبار وصيتي — نظام الإيميل يعمل',
    html,
  })

  if (success) {
    return NextResponse.json({ success: true, message: `Sent to ${to}` })
  } else {
    return NextResponse.json({
      success: false,
      error: 'RESEND_API_KEY غير مضبوط أو حدث خطأ في الإرسال'
    }, { status: 500 })
  }
}
