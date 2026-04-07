'use client'
// src/app/dashboard/drive/page.tsx
import { useState, useEffect } from 'react'
import { HardDrive, ExternalLink, FileJson, RefreshCw, AlertCircle, LogOut, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

type DriveFile = { id: string; name: string; createdTime: string; modifiedTime: string; size?: string }

export default function DrivePage() {
  const [data, setData] = useState<{ files: DriveFile[]; folderUrl: string } | null>(null)
  const [permissionError, setPermissionError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDrive = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/drive')
      const json = await res.json()
      if (json.error === 'drive_permission_missing') setPermissionError(true)
      else if (json.success) { setData(json.data); setPermissionError(false) }
      else setError(json.message || 'خطأ غير معروف')
    } catch { setError('تعذر الاتصال بالخادم') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchDrive() }, [])

  const handleReconnect = async () => {
    setRevoking(true)
    try {
      // Clear old tokens
      await fetch('/api/auth/revoke-drive', { method: 'POST' })
      // Redirect to NextAuth Google signin with forced consent
      window.location.href = '/api/auth/signin/google?callbackUrl=/dashboard/drive&prompt=consent'
    } catch { setRevoking(false) }
  }

  return (
    <div className="animate-fade-in space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">التخزين السحابي</p>
          <h1 className="page-title">Google Drive</h1>
          <p className="text-[#7A6A52] text-sm mt-1">نسخ احتياطية تلقائية من رسائلك</p>
        </div>
        {!permissionError && !loading && (
          <button onClick={fetchDrive} className="btn-secondary text-sm flex items-center gap-2 py-2 px-4">
            <RefreshCw size={14} /> تحديث
          </button>
        )}
      </div>

      {/* Permission error */}
      {permissionError && (
        <div className="space-y-4">
          <div className="card border-orange-200 bg-orange-50 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-800 font-semibold">مطلوب إذن Google Drive</p>
                <p className="text-orange-700 text-sm mt-1 leading-relaxed">
                  اضغط الزر أدناه — ستنتقل لصفحة Google وتضغط <strong>"السماح / Allow"</strong>.
                  ستعود للموقع تلقائياً بعدها.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-orange-200 p-4 space-y-2">
              {['اضغط "ربط Google Drive"', 'اختر حسابك على Google', 'اضغط "Allow" على الصلاحيات', 'ستعود للموقع تلقائياً'].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-orange-700">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-orange-600">
                    {i + 1}
                  </div>
                  {step}
                </div>
              ))}
            </div>

            <button onClick={handleReconnect} disabled={revoking}
              className="w-full flex items-center justify-center gap-2 bg-[#1A1208] text-[#D4A017] py-3 rounded-xl text-sm font-medium hover:bg-[#D4A017] hover:text-[#1A1208] transition-all disabled:opacity-60">
              {revoking
                ? <><RefreshCw size={14} className="animate-spin" /> جارٍ التوجيه لـ Google...</>
                : <><LogOut size={14} /> ربط Google Drive الآن ←</>
              }
            </button>
          </div>
        </div>
      )}

      {loading && !permissionError && (
        <div className="card text-center py-12">
          <RefreshCw className="w-8 h-8 text-[#B8860B] mx-auto animate-spin" />
          <p className="text-[#7A6A52] text-sm mt-3">جارٍ الاتصال بـ Google Drive...</p>
        </div>
      )}

      {error && !loading && (
        <div className="card border-red-200 bg-red-50 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
          <div>
            <p className="text-red-700 text-sm">{error}</p>
            <button onClick={fetchDrive} className="text-red-600 text-xs hover:underline mt-1">إعادة المحاولة</button>
          </div>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FAF3E0] rounded-xl flex items-center justify-center">
                <HardDrive size={18} className="text-[#B8860B]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[#1A1208] font-medium text-sm">مجلد وصيتي</p>
                  <CheckCircle size={14} className="text-green-500" />
                </div>
                <p className="text-[#7A6A52] text-xs">{data.files.length} ملف محفوظ</p>
              </div>
            </div>
            <a href={data.folderUrl} target="_blank" rel="noreferrer"
              className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5">
              <ExternalLink size={12} /> فتح في Drive
            </a>
          </div>

          {data.files.length === 0 ? (
            <div className="card text-center py-12">
              <FileJson className="w-10 h-10 text-[#7A6A52] mx-auto mb-3 opacity-30" />
              <p className="text-[#7A6A52] text-sm">لا توجد ملفات بعد</p>
              <p className="text-[#7A6A52] text-xs mt-1">تُحفظ رسائلك هنا تلقائياً عند إنشائها</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.files.map(file => (
                <div key={file.id} className="card-elevated flex items-center gap-4">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileJson size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1A1208] text-sm font-medium truncate">{file.name.replace('.json', '')}</p>
                    <p className="text-[#7A6A52] text-xs mt-0.5">
                      {formatDistanceToNow(new Date(file.modifiedTime), { locale: ar, addSuffix: true })}
                      {file.size && <span className="mr-2 text-[#B8860B]">{(parseInt(file.size)/1024).toFixed(1)}KB</span>}
                    </p>
                  </div>
                  <a href={`https://drive.google.com/file/d/${file.id}/view`} target="_blank" rel="noreferrer"
                    className="text-[#7A6A52] hover:text-[#B8860B] transition-colors p-1">
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
