// src/app/api/admin/stats/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalUsers, activeUsers, totalMessages, sentMessages,
    triggeredSwitches, newUsersThisMonth, planBreakdown,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { switchStatus: 'ACTIVE' } }),
    prisma.message.count(),
    prisma.message.count({ where: { status: 'SENT' } }),
    prisma.user.count({ where: { switchStatus: 'TRIGGERED' } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.user.groupBy({ by: ['plan'], _count: { _all: true } }),
    prisma.user.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, image: true,
        plan: true, role: true, switchStatus: true,
        createdAt: true, lastLoginAt: true,
        _count: { select: { messages: true } },
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      stats: {
        totalUsers, activeUsers, totalMessages, sentMessages,
        triggeredSwitches, newUsersThisMonth,
      },
      planBreakdown,
      recentUsers,
    },
  })
}
