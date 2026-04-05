// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search') || ''
  const plan = searchParams.get('plan') || undefined
  const status = searchParams.get('status') || undefined

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(plan && { plan: plan as any }),
    ...(status && { switchStatus: status as any }),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, image: true,
        plan: true, role: true, switchStatus: true, switchEnabled: true,
        createdAt: true, lastLoginAt: true, switchLastCheckin: true,
        _count: { select: { messages: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: { users, total, page, totalPages: Math.ceil(total / limit) },
  })
}

// PATCH /api/admin/users — update user plan/role
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { userId, plan, role } = body

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(plan && { plan }),
      ...(role && { role }),
    },
    select: { id: true, name: true, email: true, plan: true, role: true },
  })

  return NextResponse.json({ success: true, data: user })
}
