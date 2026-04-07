'use client'
// src/app/dashboard/drive/page.tsx
import { useState, useEffect } from 'react'
import { HardDrive, ExternalLink, FileJson, RefreshCw, AlertCircle, CheckCircle, Link2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

type DriveFile = { id: string; name: string; createdTime: string; modifiedTime: string; size?: string }
type DriveResponse =
  | { success: true; data: { files: DriveFile[]; folderUrl: string } }
  | { success: false; error: string; message: string; debug?: string }

export default function DrivePage() {
  const [resp, setResp] = useState<DriveResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDrive = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/drive')
      setResp(await res.json())
    } catch {
      setResp({ success: false, error: 'network', message: 'تعذر الاتصال بالخادم' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDrive() }, [])

  const handleConnect = () => {
    // Redirect to our dedicated Google Drive OAuth endpoint
    window.location.href = '/api/auth/google-drive-connect?callbackUrl=/dashboard/drive'
  }

  const permissionError = !resp?.success && (
    resp?.error === 'drive_permission_missing' || resp?.error === 'drive_error'
  )

  return (
    <div className="animate-fade-in w-full max-w-2xl mx-auto space-y-6 px-4 sm:px-6 md:px-0" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="section-label text-xs md:text-sm">التخزين السحابي</p>
          <h1 className="page-title text-2xl md:text-3xl">Google Drive</h1>
          <p className="text-[#7A6A52] text-xs md:text-sm mt-1">نسخ احتياطية تلقائية من رسائلك</p>
        </div>
        {resp?.success && (
          <button onClick={fetchDrive} className="btn-secondary text-xs md:text-sm flex items-center gap-2 py-2.5 md:py-3 px-3 md:px-4 w-full sm:w-auto justify-center">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> تحديث
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="card text-center py-8 md:py-12">
          <RefreshCw className="w-6 h-6 md:w-8 md:h-8 text-[#B8860B] mx-auto animate-spin" />
          <p className="text-[#7A6A52] text-xs md:text-sm mt-3">جارٍ الاتصال...</p>
        </div>
      )}

      {/* Permission Error */}
      {!loading && permissionError && (
        <div className="space-y-4">
          <div className="card border-amber-200 bg-amber-50 space-y-5 p-4 md:p-6">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5 md:w-[20px] md:h-[20px]" />
              <div>
                <p className="text-amber-800 font-semibold text-xs md:text-sm">يحتاج ربط Google Drive</p>
                <p className="text-amber-700 text-xs md:text-sm mt-1 leading-relaxed">
                  {resp?.message}
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="bg-white rounded-lg md:rounded-xl border border-amber-200 p-3 md:p-4 space-y-2 md:space-y-3">
              <p className="text-amber-800 text-xs font-semibold">كيفية الربط:</p>
              {[
                'اضغط "ربط Google Drive" أدناه',
                'سيفتح نافذة Google — اختر حسابك',
                'اضغط "Allow" على صلاحية الوصول لـ Drive',
                'ستعود للموقع تلقائياً وتظهر ملفاتك',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 md:gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-700 text-xs font-bold">{i + 1}</span>
                  </div>
                  <span className="text-amber-700 text-xs md:text-sm">{step}</span>
                </div>
              ))}
            </div>

            <button onClick={handleConnect}
              className="w-full flex items-center justify-center gap-2 bg-[#1A1208] text-[#D4A017] py-3 md:py-4 rounded-lg md:rounded-xl font-medium text-sm hover:bg-[#D4A017] hover:text-[#1A1208] transition-all">
              <Link2 size={14} />
              ربط Google Drive الآن
            </button>

            {resp?.debug && (
              <p className="text-amber-600 text-xs opacity-60 text-center">
                Debug: {resp.debug}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Success */}
      {!loading && resp?.success && (
        <>
          <div className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FAF3E0] rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                <HardDrive size={16} className="text-[#B8860B] md:w-[18px] md:h-[18px]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[#1A1208] font-medium text-sm">مجلد وصيتي</p>
                  <CheckCircle size={12} className="text-green-500 md:w-[14px] md:h-[14px]" />
                </div>
                <p className="text-[#7A6A52] text-xs">{resp.data.files.length} ملف محفوظ</p>
              </div>
            </div>
            <a href={resp.data.folderUrl} target="_blank" rel="noreferrer"
              className="btn-secondary text-xs py-2.5 md:py-3 px-3 md:px-4 flex items-center gap-1.5 w-full sm:w-auto justify-center">
              <ExternalLink size={12} /> فتح في Drive
            </a>
          </div>

          {resp.data.files.length === 0 ? (
            <div className="card text-center py-8 md:py-12 px-4">
              <FileJson className="w-8 h-8 md:w-10 md:h-10 text-[#7A6A52] mx-auto mb-3 opacity-30" />
              <p className="text-[#7A6A52] text-xs md:text-sm">لا توجد ملفات بعد</p>
              <p className="text-[#7A6A52] text-xs mt-1">تُحفظ رسائلك هنا تلقائياً عند إنشاؤها</p>
            </div>
          ) : (
            <div className="space-y-2">
              {resp.data.files.map((file: DriveFile) => (
                <div key={file.id} className="card-elevated flex items-start sm:items-center gap-3 md:gap-4 p-3 md:p-4">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileJson size={14} className="text-blue-600 md:w-[16px] md:h-[16px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1A1208] text-sm font-medium truncate">
                      {file.name.replace('.json', '')}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-0.5 text-xs">
                      <p className="text-[#7A6A52]">
                        {formatDistanceToNow(new Date(file.modifiedTime), { locale: ar, addSuffix: true })}
                      </p>
                      {file.size && (
                        <p className="text-[#B8860B]">
                          {(parseInt(file.size) / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                  </div>
                  <a href={`https://drive.google.com/file/d/${file.id}/view`} target="_blank" rel="noreferrer"
                    className="text-[#7A6A52] hover:text-[#B8860B] transition-colors p-1 flex-shrink-0">
                    <ExternalLink size={14} />
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
