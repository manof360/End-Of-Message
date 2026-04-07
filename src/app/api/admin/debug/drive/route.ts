// src/app/api/admin/debug/drive/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDriveStatus, areGoogleCredentialsValid } from '@/lib/google-drive'

/**
 * Debug endpoint for Google Drive integration
 * Only accessible to admins
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  // Check authentication and admin role
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get target user ID from query params
  const userId = req.nextUrl.searchParams.get('userId') || session.user.id

  try {
    // Check server-level configuration
    const credsValid = await areGoogleCredentialsValid()

    // Check user-level Drive status
    const driveStatus = await getDriveStatus(userId)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      server: {
        hasGoogleCredentials: credsValid,
        clientIdConfigured: !!(
          process.env.GOOGLE_CLIENT_ID &&
          process.env.GOOGLE_CLIENT_ID !== 'placeholder'
        ),
        clientSecretConfigured: !!(
          process.env.GOOGLE_CLIENT_SECRET &&
          process.env.GOOGLE_CLIENT_SECRET !== 'placeholder'
        ),
      },
      user: {
        userId,
        ...driveStatus,
      },
      instructions: {
        ifNoScope: 'User needs to visit /api/auth/google-drive-connect to grant Drive permission',
        ifTokenExpired: 'User needs to sign out and sign back in to refresh tokens',
        ifNoAccount: 'User needs to sign in with Google first',
        serverError: 'Contact admin to verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in Vercel environment',
      },
    })
  } catch (error: any) {
    console.error('[Debug Drive] Error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || String(error),
    }, { status: 500 })
  }
}
