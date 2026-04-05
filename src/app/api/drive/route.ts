// src/app/api/drive/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listMessagesFromDrive, getOrCreateWasiyatiFolder } from '@/lib/google-drive'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    // Handle missing Drive permissions gracefully
    if (error.message?.includes('No Google account') || error.code === 401) {
      return NextResponse.json({
        success: false,
        error: 'drive_permission_missing',
        message: 'يرجى تسجيل الخروج وإعادة الدخول للسماح بالوصول إلى Google Drive',
      }, { status: 403 })
    }
    throw error
  }
}
