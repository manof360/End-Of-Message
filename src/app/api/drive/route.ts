// src/app/api/drive/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listMessagesFromDrive, getOrCreateWasiyatiFolder } from '@/lib/google-drive'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    console.error('[Drive API] Error:', error?.message || error)

    const msg = error?.message || ''
    const code = error?.code || 'UNKNOWN'

    // Handle specific error types
    if (code === 'NO_DRIVE_SCOPE' || msg.includes('Drive scope')) {
      return NextResponse.json({
        success: false,
        error: 'drive_permission_missing',
        message: 'صلاحية Drive غير مُفعَّلة. يرجى الربط مع Google Drive للمتابعة.',
        debug: msg,
      }, { status: 403 })
    }

    if (code === 'TOKEN_EXPIRED' || msg.includes('Token has been expired') || msg.includes('invalid_grant')) {
      return NextResponse.json({
        success: false,
        error: 'drive_permission_missing',
        message: 'انتهت صلاحية الرمز — يرجى إعادة الربط مع Google.',
        debug: msg,
      }, { status: 403 })
    }

    if (code === 'INSUFFICIENT_PERMISSION' || msg.includes('insufficientPermissions') || msg.includes('Insufficient Permission')) {
      return NextResponse.json({
        success: false,
        error: 'drive_permission_missing',
        message: 'صلاحية Google Drive غير كافية. يرجى إعادة الربط.',
        debug: msg,
      }, { status: 403 })
    }

    if (code === 'MISSING_CREDENTIALS') {
      return NextResponse.json({
        success: false,
        error: 'server_error',
        message: 'خطأ خادم: بيانات Google غير مكتملة',
        debug: msg,
      }, { status: 500 })
    }

    if (code === 'NO_ACCOUNT' || msg.includes('No Google account')) {
      return NextResponse.json({
        success: false,
        error: 'drive_permission_missing',
        message: 'لم يتم ربط حسابك مع Google بعد.',
        debug: msg,
      }, { status: 403 })
    }

    // Handle Google Drive API not enabled error
    if (msg.includes('Google Drive API has not been used') || msg.includes('drive.googleapis.com')) {
      return NextResponse.json({
        success: false,
        error: 'api_not_enabled',
        message: 'خطأ: Google Drive API غير مفعلة في Google Cloud Console',
        details: 'يرجى القيام بالخطوات التالية:',
        steps: [
          '1. اذهب إلى: https://console.cloud.google.com/apis/library/drive.googleapis.com',
          '2. اضغط الزر الأزرق "ENABLE"',
          '3. انتظر 1-2 دقيقة',
          '4. حاول الربط مجدداً من الموقع',
        ],
        documentationUrl: '/GOOGLE_DRIVE_SETUP.md',
        debugUrl: '/api/admin/debug/google-api',
        debug: msg,
      }, { status: 503 })
    }

    // Handle projectId issues
    if (msg.includes('project') && msg.includes('XXX')) {
      return NextResponse.json({
        success: false,
        error: 'api_not_enabled',
        message: 'خطأ: Google Drive API غير مفعلة للمشروع',
        hint: 'تحقق من أن GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET من نفس مشروع Google Cloud',
        debugUrl: '/api/admin/debug/google-api',
        debug: msg,
      }, { status: 503 })
    }

    // Generic error
    return NextResponse.json({
      success: false,
      error: 'drive_error',
      message: `خطأ في الوصول إلى Google Drive: ${msg}`,
      debugUrl: '/api/admin/debug/google-api',
      debug: msg,
    }, { status: 500 })
  }
}
