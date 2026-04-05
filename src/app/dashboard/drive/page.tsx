'use client'
// src/app/dashboard/drive/page.tsx
import { useState, useEffect } from 'react'
import { HardDrive, ExternalLink, FileJson, RefreshCw, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

type DriveFile = {
  id: string
  name: string
  createdTime: string
  modifiedTime: string
  size: string
}

type DriveData = {
  files: DriveFile[]
  folderId: string
  folderUrl: string
}

export default function DrivePage() {
  const [data, setData] = useState<DriveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDrive = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/drive')
      const d = await res.json()
      if (d.success) {
        setData(d.data)
      } else {
        setError(d.message || 'خطأ في تحميل Drive')
      }
    } catch {
      setError('تعذّر الاتصال بـ Google Drive')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDrive() }, [])

  const formatSize = (bytes: string) => {
    const b = parseInt(bytes || '0')
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="animate-fade-in max-w-2xl space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">النسخ الاحتياطية</p>
          <h1 className="page-title">Google Drive</h1>
          <p className="text-[#7A6A52] text-sm mt-1">رسائلك محفوظة تلقائياً في حسابك</p>
        </div>
        <button onClick={fetchDrive} disabled={loading}
          className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* Explanation */}
      <div className="card bg-blue-50 border-blue-200 space-y-2">
        <div className="flex items-center gap-2">
          <HardDrive size={16} className="text-blue-600" />
          <h3 className="text-blue-900 font-medium text-sm">كيف يعمل الحفظ التلقائي؟</h3>
        </div>
        <p className="text-blue-700 text-sm leading-relaxed">
          عند إنشاء رسالة جديدة، تُحفظ نسخة JSON في مجلد
          <strong> وصيتي - Wasiyati </strong>
          في Google Drive الخاص بك. هذا يضمن أن بياناتك ملكك دائماً حتى لو توقف التطبيق.
        </p>
      </div>

      {loading ? (
        <div className="card text-center py-12">
          <div className="w-8 h-8 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#7A6A52] text-sm mt-4">جارٍ الاتصال بـ Google Drive...</p>
        </div>
      ) : error ? (
        <div className="card border-red-200 bg-red-50 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600" />
            <h3 className="text-red-800 font-medium">تعذّر الوصول لـ Drive</h3>
          </div>
          <p className="text-red-700 text-sm">{error}</p>
          <p className="text-red-600 text-xs">
            الحل: سجّل الخروج وأعد الدخول، وتأكد من الموافقة على صلاحية Google Drive.
          </p>
        </div>
      ) : (
        <>
          {/* Folder link */}
          {data?.folderUrl && (
            <a href={data.folderUrl} target="_blank" rel="noopener noreferrer"
              className="card-elevated flex items-center gap-4 group hover:border-blue-300 no-underline">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <HardDrive size={22} className="text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-[#1A1208] font-medium">مجلد وصيتي على Drive</p>
                <p className="text-[#7A6A52] text-xs mt-0.5 font-mono" dir="ltr">{data.folderId}</p>
              </div>
              <ExternalLink size={16} className="text-[#7A6A52] group-hover:text-blue-500 transition-colors" />
            </a>
          )}

          {/* Files */}
          <div className="card space-y-1 p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(184,134,11,0.1)]">
              <h2 className="font-semibold text-[#1A1208]">
                الملفات المحفوظة ({data?.files?.length ?? 0})
              </h2>
            </div>

            {!data?.files?.length ? (
              <div className="text-center py-12">
                <FileJson className="w-10 h-10 text-[#7A6A52] mx-auto mb-3 opacity-30" />
                <p className="text-[#7A6A52] text-sm">لا توجد ملفات بعد</p>
                <p className="text-[#7A6A52] text-xs mt-1">ستظهر هنا عند إنشاء أول رسالة</p>
              </div>
            ) : (
              <div>
                {data.files.map((file, i) => (
                  <div key={file.id}
                    className={`flex items-center gap-4 px-5 py-3 hover:bg-[#FAF3E0] transition-colors ${
                      i < data.files.length - 1 ? 'border-b border-[rgba(184,134,11,0.08)]' : ''
                    }`}>
                    <div className="w-8 h-8 bg-[#FAF3E0] rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileJson size={16} className="text-[#B8860B]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1A1208] text-sm font-medium truncate">{file.name}</p>
                      <p className="text-[#7A6A52] text-xs mt-0.5">
                        {formatDistanceToNow(new Date(file.modifiedTime), { locale: ar, addSuffix: true })}
                        {file.size && ` · ${formatSize(file.size)}`}
                      </p>
                    </div>
                    <a
                      href={`https://drive.google.com/file/d/${file.id}/view`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[#7A6A52] hover:text-blue-500 transition-colors p-1"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
