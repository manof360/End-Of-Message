// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveMessageToDrive } from '@/lib/google-drive'
import { z } from 'zod'

const createMessageSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  triggerType: z.enum(['SWITCH', 'DATE', 'KEYHOLDER']),
  scheduledAt: z.string().datetime().optional().nullable(),
  recipients: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    channel: z.enum(['EMAIL', 'WHATSAPP', 'SMS']),
  })).min(1).max(10),
})

// GET /api/messages — list user's messages
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const messages = await prisma.message.findMany({
    where: { userId: session.user.id },
    include: { recipients: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: messages })
}

// POST /api/messages — create new message
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check plan limits
  const messageCount = await prisma.message.count({
    where: { userId: session.user.id },
  })
  const limits = { FREE: 1, BASIC: 5, PREMIUM: 999 }
  const limit = limits[session.user.plan as keyof typeof limits] ?? 1
  if (messageCount >= limit) {
    return NextResponse.json(
      { error: `خطتك تسمح بـ ${limit} رسالة فقط. يرجى الترقية.` },
      { status: 403 }
    )
  }

  const body = await req.json()
  const parsed = createMessageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'بيانات غير صالحة', details: parsed.error.flatten() }, { status: 400 })
  }

  const { title, content, triggerType, scheduledAt, recipients } = parsed.data

  // Create message with recipients
  const message = await prisma.message.create({
    data: {
      userId: session.user.id,
      title,
      content,
      triggerType,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: 'ACTIVE',
      recipients: {
        create: recipients.map(r => ({
          name: r.name,
          email: r.email,
          phone: r.phone,
          channel: r.channel,
          status: 'PENDING',
        })),
      },
    },
    include: { recipients: true },
  })

  // Save to Google Drive (non-blocking)
  saveMessageToDrive(session.user.id, message.id, {
    title,
    content,
    recipients: recipients.map(r => ({ name: r.name, email: r.email, channel: r.channel })),
    triggerType,
    scheduledAt: scheduledAt ?? null,
    createdAt: message.createdAt.toISOString(),
  }).catch(err => console.error('Drive save failed (non-critical):', err))

  return NextResponse.json({ success: true, data: message }, { status: 201 })
}
