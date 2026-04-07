// src/app/api/auth/revoke-drive/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Clear stored tokens → forces Google to show consent screen again
  await prisma.account.updateMany({
    where: { userId: session.user.id, provider: 'google' },
    data: {
      access_token: null,
      refresh_token: null,
      expires_at: null,
      scope: null,
    },
  })

  return NextResponse.json({ success: true })
}
