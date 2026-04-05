'use client'
// src/app/dashboard/drive/page.tsx
import { useState, useEffect } from 'react'
import { HardDrive, ExternalLink, FileJson, RefreshCw, AlertCircle, LogOut } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import { signOut } from 'next-auth/react'

type DriveFile = { id: string; name: string; createdTime: string; modifiedTime: string; size?: string }

export default function DrivePage() {
  const [data, setData] = useState<{ files: DriveFile[]; folderUrl: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [permissionError, setPermissionError] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchDrive = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/drive')
      const json = await res.json()
      if (json.error === 'drive_permission_missing') {
        setPermissionError(true)
      } else if (json.success) {
        setData(json.data)
      } else {
        setError(json.message || 'خطأ غير معروف')
      }
    } catch {
      setError('تعذر الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDrive() }, [])

  return (
    <div className="animate-fade-in space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">التخزين السحابي</p>
          <h1 className="page-title">Google Drive</h1>
          <p className="text-[#7A6A52] text-sm mt-1">نسخ احتياطية من رسائلك</p>
        </div>
        {!permissionError && (
          <button onClick={fetchDrive} className="btn-secondary text-sm flex items-center gap-2 py-2 px-4">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            تحديث
          </button>
        )}
      </div>

      {/* Permission error */}
      {permissionError && (
        <div className="card border-orange-200 bg-orange-50 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-800 font-medium">يحتاج صلاحية Google Drive</p>
              <p className="text-orange-700 text-sm mt-1">
                لحفظ رسائلك في Google Drive، يجب تسجيل الخروج وإعادة الدخول مرة واحدة فقط
                للسماح للتطبيق بالوصول.
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors"
          >
            <LogOut size={14} />
            تسجيل الخروج وإعادة الربط
          </button>
          <p className="text-orange-600 text-xs">
            بعد تسجيل الدخول مجدداً، ستظهر صفحة Google تطلب إذن الوصول لـ Drive — اضغط "السماح".
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && !permissionError && (
        <div className="card text-center py-12">
          <RefreshCw className="w-8 h-8 text-[#B8860B] mx-auto animate-spin" />
          <p className="text-[#7A6A52] text-sm mt-3">جارٍ الاتصال بـ Google Drive...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="card border-red-200 bg-red-50 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-600" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Success */}
      {data && !loading && (
        <>
          <div className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FAF3E0] rounded-xl flex items-center justify-center">
                <HardDrive size={18} className="text-[#B8860B]" />
              </div>
              <div>
                <p className="text-[#1A1208] font-medium text-sm">مجلد وصيتي</p>
                <p className="text-[#7A6A52] text-xs">{data.files.length} ملف محفوظ</p>
              </div>
            </div>
            <a
              href={data.folderUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <ExternalLink size={12} />
              فتح في Drive
            </a>
          </div>

          {data.files.length === 0 ? (
            <div className="card text-center py-12">
              <FileJson className="w-10 h-10 text-[#7A6A52] mx-auto mb-3 opacity-30" />
              <p className="text-[#7A6A52] text-sm">لا توجد ملفات بعد</p>
              <p className="text-[#7A6A52] text-xs mt-1">ستُحفظ رسائلك هنا تلقائياً عند إنشائها</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.files.map(file => (
                <div key={file.id} className="card-elevated flex items-center gap-4">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileJson size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1A1208] text-sm font-medium truncate">{file.name}</p>
                    <p className="text-[#7A6A52] text-xs mt-0.5">
                      آخر تعديل: {formatDistanceToNow(new Date(file.modifiedTime), { locale: ar, addSuffix: true })}
                      {file.size && <span className="mr-2">{(parseInt(file.size) / 1024).toFixed(1)} KB</span>}
                    </p>
                  </div>
                  <a
                    href={`https://drive.google.com/file/d/${file.id}/view`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#7A6A52] hover:text-[#B8860B] transition-colors"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
