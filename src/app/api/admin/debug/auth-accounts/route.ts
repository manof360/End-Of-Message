// src/app/api/admin/debug/auth-accounts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Debug endpoint for checking all accounts
 * Only accessible to admins
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Get current user's session
    const currentUserSession = await prisma.session.findFirst({
      where: { userId: session.user.id },
      select: { expiresAt: true },
    })

    // Get current user's account
    const currentUserAccount = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: 'google' },
      select: {
        access_token: !!true,
        refresh_token: !!true,
        scope: true,
        expires_at: true,
        token_type: true,
      },
    })

    // Get all Google accounts for analysis
    const allGoogleAccounts = await prisma.account.findMany({
      where: { provider: 'google' },
      select: {
        id: true,
        userId: true,
        access_token: !!true,
        refresh_token: !!true,
        scope: true,
        expires_at: true,
        token_type: true,
      },
    })

    // Analyze each account
    const accounts = await Promise.all(
      allGoogleAccounts.map(async (acc) => {
        const user = await prisma.user.findUnique({
          where: { id: acc.userId },
          select: { email: true, name: true },
        })

        const hasAccessToken = acc.access_token
        const hasRefreshToken = acc.refresh_token
        const hasScope = !!acc.scope
        const scopeHasDrive = acc.scope?.includes('drive') ?? false
        const isExpired = acc.expires_at ? acc.expires_at < Math.floor(Date.now() / 1000) : false

        return {
          userId: acc.userId,
          userEmail: user?.email,
          userName: user?.name,
          hasAccessToken,
          hasRefreshToken,
          hasScope,
          scopeHasDrive,
          tokenType: acc.token_type,
          expiresAt: acc.expires_at ? new Date(acc.expires_at * 1000).toISOString() : null,
          isExpired,
          status: hasAccessToken && scopeHasDrive && !isExpired ? 'OK' : 'ISSUE',
        }
      })
    )

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      currentUser: {
        userId: session.user.id,
        email: session.user.email,
        sessionExpires: currentUserSession?.expiresAt?.toISOString() || null,
        hasGoogleAccount: !!currentUserAccount,
        googleAccount: currentUserAccount
          ? {
              hasAccessToken: currentUserAccount.access_token,
              hasRefreshToken: currentUserAccount.refresh_token,
              hasScope: !!currentUserAccount.scope,
              scopeHasDrive: currentUserAccount.scope?.includes('drive') ?? false,
              expiresAt: currentUserAccount.expires_at
                ? new Date(currentUserAccount.expires_at * 1000).toISOString()
                : null,
            }
          : null,
      },
      summary: {
        totalGoogleAccounts: allGoogleAccounts.length,
        accountsWithAccessToken: accounts.filter((a) => a.hasAccessToken).length,
        accountsWithDriveScope: accounts.filter((a) => a.scopeHasDrive).length,
        accountsWithIssues: accounts.filter((a) => a.status === 'ISSUE').length,
      },
      accounts,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}
