// src/app/api/keyholders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const keyholders = await prisma.keyholder.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ success: true, data: keyholders })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const count = await prisma.keyholder.count({ where: { userId: session.user.id } })
  const limits = { FREE: 1, BASIC: 2, PREMIUM: 5 }
  const limit = limits[session.user.plan as keyof typeof limits] ?? 1
  if (count >= limit) {
    return NextResponse.json({ error: `خطتك تسمح بـ ${limit} شاهد فقط.` }, { status: 403 })
  }

  const { name, email } = await req.json()
  if (!name || !email) return NextResponse.json({ error: 'الاسم والبريد مطلوبان' }, { status: 400 })

  const keyholder = await prisma.keyholder.create({
    data: { userId: session.user.id, name, email },
  })

  // Send notification to keyholder
  await sendEmail({
    to: email,
    subject: `${session.user.name} اختارك شاهداً موثوقاً في وصيتي`,
    html: `
<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#1A1208;color:#FDF8F0;padding:40px 20px;direction:rtl;">
  <div style="max-width:500px;margin:0 auto;background:#2A1F0E;border:1px solid rgba(184,134,11,0.3);border-radius:12px;padding:32px;">
    <h1 style="color:#D4A017;">وصيتي</h1>
    <h2 style="color:#FDF8F0;font-size:18px;">أنت شاهد موثوق</h2>
    <p style="color:rgba(253,248,240,0.8);line-height:1.8;">عزيزي ${name}،</p>
    <p style="color:rgba(253,248,240,0.8);line-height:1.8;">
      اختارك <strong style="color:#D4A017">${session.user.name}</strong> شاهداً موثوقاً في تطبيق وصيتي.
      دورك هو تأكيد وفاته في حال انقطع عن الموقع لفترة طويلة، مما يُفعّل إرسال رسائله لأحبائه.
    </p>
    <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:16px;margin:20px 0;">
      <p style="color:rgba(253,248,240,0.6);font-size:13px;margin:0;">
        ✓ لن تطّلع على محتوى الرسائل<br>
        ✓ ستتلقى رابطاً خاصاً عند الحاجة<br>
        ✓ يمكنك الإلغاء إن علمت أنه بخير
      </p>
    </div>
    <p style="color:rgba(253,248,240,0.4);font-size:12px;margin-top:24px;">
      لا يلزمك فعل أي شيء الآن. ستتلقى إشعاراً فقط عند الحاجة.
    </p>
  </div>
</body></html>`,
  }).catch(console.error)

  return NextResponse.json({ success: true, data: keyholder }, { status: 201 })
}
