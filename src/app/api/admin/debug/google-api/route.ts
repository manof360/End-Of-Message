// src/app/api/admin/debug/google-api/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'

/**
 * Debug Google API credentials and status
 * Helps troubleshoot authentication and API issues
 */
export async function GET(req: any) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    // Check if credentials are configured
    const credientialsConfigured = !!(
      clientId &&
      clientSecret &&
      clientId !== 'placeholder' &&
      clientSecret !== 'placeholder'
    )

    if (!credientialsConfigured) {
      return NextResponse.json({
        success: false,
        status: 'MISSING_CREDENTIALS',
        message: 'Google credentials not configured',
        details: {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          clientIdIsPlaceholder: clientId === 'placeholder',
          clientSecretIsPlaceholder: clientSecret === 'placeholder',
        },
        solution: [
          '1. Go to https://console.cloud.google.com/',
          '2. Create or select your project',
          '3. Go to APIs & Services > Credentials',
          '4. Create OAuth 2.0 Client ID (Web Application)',
          '5. Set authorized redirect URIs:',
          '   - https://yourdomain.com/api/auth/callback/google',
          '   - http://localhost:3000/api/auth/callback/google (for local dev)',
          '6. Copy Client ID and Client Secret to .env.local',
          'GOOGLE_CLIENT_ID=your_client_id',
          'GOOGLE_CLIENT_SECRET=your_client_secret',
        ],
      }, { status: 400 })
    }

    // Try to extract project ID from credentials (if it's a service account)
    // For OAuth, project ID might be embedded in the Google Cloud Console
    const clientIdParts = clientId?.split('.') || []
    const possibleProjectId = clientIdParts[clientIdParts.length - 1]?.replace('apps.googleusercontent.com', '') || 'unknown'

    return NextResponse.json({
      success: true,
      status: 'CREDENTIALS_CONFIGURED',
      credentials: {
        hasClientId: true,
        clientIdPrefix: clientId?.substring(0, 20) + '...',
        clientIdLength: clientId?.length,
        hasClientSecret: true,
        clientSecretLength: clientSecret?.length,
        possibleProjectId: possibleProjectId === 'unknown' ? 'Not determinable from OAuth credentials' : possibleProjectId,
      },
      message: 'Google credentials are configured. Verify Drive API is enabled for your Google Cloud Project.',
      verification: {
        step1: 'Go to https://console.cloud.google.com/',
        step2: 'Find your project in the top dropdown',
        step3: 'Go to APIs & Services > Enabled APIs & Services',
        step4: 'Search for "Google Drive API"',
        step5: 'It should show "Google Drive API" with a blue checkmark if enabled',
        step6: 'If not enabled, click "Enable APIs and Services" and search for Drive API',
        step7: 'Wait 1-2 minutes for change to propagate',
        step8: 'Then try again on the app',
      },
      troubleshooting: {
        issue: 'Google Drive API has not been used in project ... before or it is disabled',
        causes: [
          'Drive API not enabled in Google Cloud Console',
          'Credentials are from a different project than where Drive API is enabled',
          'API was just enabled and change hasn\'t propagated yet (wait 1-2 minutes)',
          'Billing account not set up for the project (some APIs require billing)',
        ],
        solutions: [
          '1. Check that Drive API is enabled: https://console.cloud.google.com/apis/library/drive.googleapis.com',
          '2. Make sure you\'re in the same project where credentials were created',
          '3. If just enabled, wait 1-2 minutes and try again',
          '4. Check if project has a billing account attached: https://console.cloud.google.com/billing',
        ],
      },
      documentation: {
        setupGuide: 'See GOOGLE_DRIVE_SETUP.md in project root',
        troubleshootingGuide: 'See GOOGLE_DRIVE_TROUBLESHOOTING.md in project root',
      },
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
