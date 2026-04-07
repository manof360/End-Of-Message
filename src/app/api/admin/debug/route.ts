// src/app/api/admin/debug/route.ts — admin only, shows system status
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check email config
  const emailConfig = {
    hasResendKey: !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'placeholder',
    fromAddress: process.env.EMAIL_FROM || 'not set',
    nextauthUrl: process.env.NEXTAUTH_URL || 'not set',
  }

  // Check Drive config for this user
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: 'google' },
    select: {
      scope: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  })

  const driveConfig = {
    hasAccount: !!account,
    hasAccessToken: !!account?.access_token,
    hasRefreshToken: !!account?.refresh_token,
    scope: account?.scope || 'none',
    hasDriveScope: account?.scope?.includes('drive') || false,
    tokenExpiry: account?.expires_at
      ? new Date(account.expires_at * 1000).toISOString()
      : 'unknown',
    isExpired: account?.expires_at
      ? account.expires_at * 1000 < Date.now()
      : null,
  }

  return NextResponse.json({
    success: true,
    data: { emailConfig, driveConfig },
  })
}
