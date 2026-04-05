// src/app/api/messages/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteMessageFromDrive } from '@/lib/google-drive'

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

  const body = await req.json()
  const updated = await prisma.message.update({
    where: { id: params.id },
    data: {
      title: body.title,
      content: body.content,
      triggerType: body.triggerType,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
    },
    include: { recipients: true },
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const message = await prisma.message.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete from Drive first
  if (message.driveFileId) {
    await deleteMessageFromDrive(session.user.id, message.driveFileId)
  }

  await prisma.message.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
