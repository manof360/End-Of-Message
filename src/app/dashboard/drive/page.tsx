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
    <div className="animate-fade-in space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">التخزين السحابي</p>
          <h1 className="page-title">Google Drive</h1>
          <p className="text-[#7A6A52] text-sm mt-1">نسخ احتياطية تلقائية من رسائلك</p>
        </div>
        {resp?.success && (
          <button onClick={fetchDrive} className="btn-secondary text-sm flex items-center gap-2 py-2 px-4">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> تحديث
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="card text-center py-12">
          <RefreshCw className="w-8 h-8 text-[#B8860B] mx-auto animate-spin" />
          <p className="text-[#7A6A52] text-sm mt-3">جارٍ الاتصال...</p>
        </div>
      )}

      {/* Permission Error */}
      {!loading && permissionError && (
        <div className="space-y-4">
          <div className="card border-amber-200 bg-amber-50 space-y-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-semibold text-sm">يحتاج ربط Google Drive</p>
                <p className="text-amber-700 text-sm mt-1 leading-relaxed">
                  {resp?.message}
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-3">
              <p className="text-amber-800 text-xs font-semibold">كيفية الربط:</p>
              {[
                'اضغط "ربط Google Drive" أدناه',
                'سيفتح نافذة Google — اختر حسابك',
                'اضغط "Allow" على صلاحية الوصول لـ Drive',
                'ستعود للموقع تلقائياً وتظهر ملفاتك',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-700 text-xs font-bold">{i + 1}</span>
                  </div>
                  <span className="text-amber-700 text-sm">{step}</span>
                </div>
              ))}
            </div>

            <button onClick={handleConnect}
              className="w-full flex items-center justify-center gap-2 bg-[#1A1208] text-[#D4A017] py-3.5 rounded-xl font-medium hover:bg-[#D4A017] hover:text-[#1A1208] transition-all">
              <Link2 size={16} />
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
                <p className="text-[#7A6A52] text-xs">{resp.data.files.length} ملف محفوظ</p>
              </div>
            </div>
            <a href={resp.data.folderUrl} target="_blank" rel="noreferrer"
              className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5">
              <ExternalLink size={12} /> فتح في Drive
            </a>
          </div>

          {resp.data.files.length === 0 ? (
            <div className="card text-center py-12">
              <FileJson className="w-10 h-10 text-[#7A6A52] mx-auto mb-3 opacity-30" />
              <p className="text-[#7A6A52] text-sm">لا توجد ملفات بعد</p>
              <p className="text-[#7A6A52] text-xs mt-1">تُحفظ رسائلك هنا تلقائياً عند إنشائها</p>
            </div>
          ) : (
            <div className="space-y-2">
              {resp.data.files.map((file: DriveFile) => (
                <div key={file.id} className="card-elevated flex items-center gap-4">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileJson size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1A1208] text-sm font-medium truncate">
                      {file.name.replace('.json', '')}
                    </p>
                    <p className="text-[#7A6A52] text-xs mt-0.5">
                      {formatDistanceToNow(new Date(file.modifiedTime), { locale: ar, addSuffix: true })}
                      {file.size && (
                        <span className="mr-2 text-[#B8860B]">
                          {(parseInt(file.size) / 1024).toFixed(1)} KB
                        </span>
                      )}
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
