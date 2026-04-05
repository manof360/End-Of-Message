// src/app/api/keyholder/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { triggerMessages } from '@/lib/switch-engine'

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/error?msg=invalid-token', req.url))
  }

  const keyholder = await prisma.keyholder.findUnique({
    where: { activationToken: token },
    include: {
      user: {
        include: {
          messages: {
            where: { status: 'ACTIVE', triggerType: { in: ['SWITCH', 'KEYHOLDER'] } },
            include: { recipients: true },
          },
        },
      },
    },
  })

  if (!keyholder) {
    return NextResponse.redirect(new URL('/error?msg=invalid-token', req.url))
  }

  if (keyholder.confirmedAt) {
    return NextResponse.redirect(new URL('/keyholder/already-confirmed', req.url))
  }

  // Mark keyholder as confirmed
  await prisma.keyholder.update({
    where: { id: keyholder.id },
    data: { confirmedAt: new Date() },
  })

  // Trigger messages
  await triggerMessages(keyholder.userId, keyholder.user.messages)

  // Update user status
  await prisma.user.update({
    where: { id: keyholder.userId },
    data: { switchStatus: 'TRIGGERED' },
  })

  await prisma.switchLog.create({
    data: {
      userId: keyholder.userId,
      event: 'TRIGGERED',
      details: `Triggered by keyholder: ${keyholder.email}`,
    },
  })

  return NextResponse.redirect(new URL('/keyholder/confirmed', req.url))
}
