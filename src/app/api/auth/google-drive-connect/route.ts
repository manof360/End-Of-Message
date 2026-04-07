// src/app/api/auth/google-drive-connect/route.ts
// Initiates a Google OAuth flow specifically requesting Drive permissions
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const callbackUrl = new URL(req.url).searchParams.get('callbackUrl') || '/dashboard/drive'

  // Build Google OAuth URL manually with drive.file scope
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
    response_type: 'code',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/drive.file',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',  // Force consent screen to get fresh tokens with drive scope
    state: encodeURIComponent(callbackUrl),
  })

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  return NextResponse.redirect(googleAuthUrl)
}
