// src/app/api/switch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET current switch settings
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      switchEnabled: true, switchIntervalDays: true,
      switchLastCheckin: true, switchStatus: true,
    },
  })

  return NextResponse.json({ success: true, data: user })
}

// PATCH — update switch settings
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { enabled, intervalDays } = body

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(enabled !== undefined && { switchEnabled: enabled }),
      ...(intervalDays && { switchIntervalDays: Math.max(7, Math.min(365, intervalDays)) }),
    },
    select: { switchEnabled: true, switchIntervalDays: true, switchStatus: true },
  })

  await prisma.switchLog.create({
    data: {
      userId: session.user.id,
      event: enabled ? 'RESUMED' : 'PAUSED',
      details: `Switch ${enabled ? 'enabled' : 'disabled'} via settings`,
    },
  })

  return NextResponse.json({ success: true, data: user })
}

// POST /api/switch/checkin — manual check-in
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      switchLastCheckin: new Date(),
      switchStatus: 'ACTIVE',
    },
  })

  await prisma.switchLog.create({
    data: {
      userId: session.user.id,
      event: 'CHECKIN',
      details: 'Manual check-in from dashboard',
    },
  })

  return NextResponse.json({ success: true, message: 'تم تأكيد حضورك بنجاح ✓' })
}
