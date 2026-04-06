// src/app/api/messages/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteMessageFromDrive, saveMessageToDrive } from '@/lib/google-drive'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const message = await prisma.message.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { recipients: true },
  })
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: message })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const message = await prisma.message.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (message.status === 'SENT') {
    return NextResponse.json({ error: 'لا يمكن تعديل رسالة تم إرسالها' }, { status: 400 })
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Update message fields
  const updated = await prisma.message.update({
    where: { id: params.id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.content && { content: body.content }),
      ...(body.triggerType && { triggerType: body.triggerType }),
      scheduledAt: body.triggerType === 'DATE' && body.scheduledAt
        ? new Date(body.scheduledAt) : null,
    },
  })

  // Update recipients if provided
  if (Array.isArray(body.recipients) && body.recipients.length > 0) {
    // Delete old recipients and create new ones
    await prisma.recipient.deleteMany({ where: { messageId: params.id } })
    await prisma.recipient.createMany({
      data: body.recipients.map((r: any) => ({
        messageId: params.id,
        name: r.name,
        email: r.email || null,
        phone: r.phone || null,
        channel: r.channel || 'EMAIL',
        status: 'PENDING',
      })),
    })
  }

  const result = await prisma.message.findUnique({
    where: { id: params.id },
    include: { recipients: true },
  })

  // Update Drive file
  if (result) {
    saveMessageToDrive(session.user.id, params.id, {
      title: result.title,
      content: result.content,
      recipients: result.recipients.map(r => ({ name: r.name, email: r.email ?? undefined, channel: r.channel })),
      triggerType: result.triggerType,
      scheduledAt: result.scheduledAt?.toISOString() ?? null,
      createdAt: result.createdAt.toISOString(),
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, data: result })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const message = await prisma.message.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (message.driveFileId) {
    await deleteMessageFromDrive(session.user.id, message.driveFileId)
  }

  await prisma.message.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
