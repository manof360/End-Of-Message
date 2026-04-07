// src/app/api/drive/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listMessagesFromDrive, getOrCreateWasiyatiFolder } from '@/lib/google-drive'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // First check what tokens we have stored
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: 'google' },
    select: { access_token: true, refresh_token: true, scope: true, expires_at: true },
  })

  // No tokens at all
  if (!account?.access_token && !account?.refresh_token) {
    return NextResponse.json({
      success: false,
      error: 'drive_permission_missing',
      message: 'لم يتم منح صلاحية Drive بعد',
      debug: 'no_tokens',
    }, { status: 403 })
  }

  // Check if drive scope is in stored scope
  const scope = account?.scope || ''
  const hasDriveScope = scope.includes('drive')

  if (!hasDriveScope && !account?.refresh_token) {
    return NextResponse.json({
      success: false,
      error: 'drive_permission_missing',
      message: 'صلاحية Drive غير مُفعَّلة في حسابك',
      debug: `scope: ${scope}`,
    }, { status: 403 })
  }

  try {
    const [files, folderId] = await Promise.all([
      listMessagesFromDrive(session.user.id),
      getOrCreateWasiyatiFolder(session.user.id),
    ])

    return NextResponse.json({
      success: true,
      data: {
        files,
        folderId,
        folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
      },
    })
  } catch (error: any) {
    console.error('[Drive] Error:', error?.message || error)

    const msg = error?.message || ''

    if (msg.includes('Insufficient Permission') || msg.includes('insufficientPermissions') || error?.code === 403) {
      return NextResponse.json({
        success: false,
        error: 'drive_permission_missing',
        message: 'صلاحية Drive منتهية أو غير كافية',
        debug: msg,
      }, { status: 403 })
    }

    if (msg.includes('invalid_grant') || msg.includes('Token has been expired')) {
      return NextResponse.json({
        success: false,
        error: 'drive_permission_missing',
        message: 'انتهت صلاحية الرمز — يرجى إعادة الربط',
        debug: msg,
      }, { status: 403 })
    }

    return NextResponse.json({
      success: false,
      error: 'drive_error',
      message: `خطأ: ${msg}`,
    }, { status: 500 })
  }
}
