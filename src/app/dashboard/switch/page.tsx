'use client'
// src/app/dashboard/switch/page.tsx
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Bell, CheckCircle, AlertTriangle, Pause, Play, Info } from 'lucide-react'

type SwitchData = {
  switchEnabled: boolean
  switchIntervalDays: number
  switchLastCheckin: string
  switchStatus: string
}

const statusInfo: Record<string, { label: string; color: string; icon: any; desc: string }> = {
  ACTIVE:    { label: 'نشط',        color: 'text-green-700 bg-green-50 border-green-200',    icon: CheckCircle,    desc: 'كل شيء بخير. تسجيل دخولك يُعيد الساعة.' },
  WARNING:   { label: 'تحذير',      color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: AlertTriangle,  desc: 'لم تسجّل دخولك منذ فترة. سجّل الآن لتجنب التفعيل.' },
  CRITICAL:  { label: 'حرج',        color: 'text-red-700 bg-red-50 border-red-200',          icon: AlertTriangle,  desc: 'تم إبلاغ الشاهد الموثوق. سجّل دخولك فوراً للإلغاء.' },
  TRIGGERED: { label: 'مُفعَّل',    color: 'text-red-700 bg-red-50 border-red-200',          icon: Bell,           desc: 'تم إرسال رسائلك.' },
  PAUSED:    { label: 'متوقف',       color: 'text-gray-600 bg-gray-50 border-gray-200',      icon: Pause,          desc: 'المفتاح متوقف. لن تُرسَل أي رسائل.' },
}

export default function SwitchPage() {
  const [data, setData] = useState<SwitchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [interval, setIntervalDays] = useState(30)

  useEffect(() => {
    fetch('/api/switch').then(r => r.json()).then(d => {
      if (d.success) {
        setData(d.data)
        setIntervalDays(d.data.switchIntervalDays)
      }
    }).finally(() => setLoading(false))
  }, [])

  const handleCheckin = async () => {
    setCheckingIn(true)
    try {
      const res = await fetch('/api/switch', { method: 'POST' })
      const d = await res.json()
      if (d.success) {
        toast.success(d.message)
        setData(prev => prev ? { ...prev, switchLastCheckin: new Date().toISOString(), switchStatus: 'ACTIVE' } : prev)
      }
    } catch { toast.error('خطأ في الاتصال') }
    finally { setCheckingIn(false) }
  }

  const handleToggle = async () => {
    if (!data) return
    setSaving(true)
    try {
      const res = await fetch('/api/switch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !data.switchEnabled }),
      })
      const d = await res.json()
      if (d.success) {
        setData(prev => prev ? { ...prev, switchEnabled: !prev.switchEnabled } : prev)
        toast.success(data.switchEnabled ? 'تم إيقاف المفتاح' : 'تم تفعيل المفتاح')
      }
    } catch { toast.error('خطأ في الحفظ') }
    finally { setSaving(false) }
  }

  const handleSaveInterval = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/switch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalDays: interval }),
      })
      const d = await res.json()
      if (d.success) {
        setData(prev => prev ? { ...prev, switchIntervalDays: interval } : prev)
        toast.success('تم حفظ الإعدادات')
      }
    } catch { toast.error('خطأ في الحفظ') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const status = data?.switchStatus || 'ACTIVE'
  const statusMeta = statusInfo[status] || statusInfo.ACTIVE
  const StatusIcon = statusMeta.icon

  const daysSince = data?.switchLastCheckin
    ? Math.floor((Date.now() - new Date(data.switchLastCheckin).getTime()) / 86400000)
    : 0

  return (
    <div className="animate-fade-in max-w-2xl space-y-6" dir="rtl">
      <div>
        <p className="section-label">المفتاح الذكي</p>
        <h1 className="page-title">Dead Man's Switch</h1>
        <p className="text-[#7A6A52] text-sm mt-1">نظام الكشف التلقائي عن الغياب</p>
      </div>

      {/* Status card */}
      <div className={`border rounded-xl p-5 flex items-start gap-4 ${statusMeta.color}`}>
        <StatusIcon size={22} className="mt-0.5 flex-shrink-0" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">الحالة: {statusMeta.label}</span>
          </div>
          <p className="text-sm">{statusMeta.desc}</p>
          {data?.switchLastCheckin && (
            <p className="text-xs mt-2 opacity-70">
              آخر تسجيل دخول: منذ {daysSince} يوم
              {data.switchEnabled && data.switchIntervalDays && (
                <span> · الحد: {data.switchIntervalDays} يوم · متبقٍّ: {Math.max(0, data.switchIntervalDays - daysSince)} يوم</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Check-in button */}
      <div className="card text-center space-y-4">
        <div className="w-16 h-16 bg-[#FAF3E0] rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-[#B8860B]" />
        </div>
        <div>
          <h3 className="font-semibold text-[#1A1208] text-lg">أنا بخير ✓</h3>
          <p className="text-[#7A6A52] text-sm mt-1">اضغط لتأكيد حضورك وإعادة ضبط الساعة</p>
        </div>
        <button
          onClick={handleCheckin}
          disabled={checkingIn}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {checkingIn
            ? <div className="w-4 h-4 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
            : <CheckCircle size={16} />}
          {checkingIn ? 'جارٍ التأكيد...' : 'تأكيد الحضور'}
        </button>
      </div>

      {/* Settings */}
      <div className="card space-y-5">
        <h2 className="font-semibold text-[#1A1208]">إعدادات المفتاح</h2>

        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 bg-[#FDF8F0] rounded-xl border border-[rgba(184,134,11,0.15)]">
          <div>
            <p className="text-[#1A1208] text-sm font-medium">تفعيل المفتاح</p>
            <p className="text-[#7A6A52] text-xs mt-0.5">تفعيل نظام الكشف عن الغياب</p>
          </div>
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              data?.switchEnabled ? 'bg-[#D4A017]' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
              data?.switchEnabled ? 'translate-x-1' : 'translate-x-7'
            }`} />
          </button>
        </div>

        {/* Interval slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[#1A1208] text-sm font-medium">فترة الانتظار قبل التفعيل</label>
            <span className="text-[#D4A017] font-bold text-lg">{interval} يوم</span>
          </div>
          <input
            type="range"
            min={7} max={365} step={1}
            value={interval}
            onChange={e => setIntervalDays(Number(e.target.value))}
            className="w-full accent-[#D4A017]"
          />
          <div className="flex justify-between text-xs text-[#7A6A52]">
            <span>7 أيام</span>
            <span>شهر</span>
            <span>3 أشهر</span>
            <span>6 أشهر</span>
            <span>سنة</span>
          </div>
        </div>

        <button onClick={handleSaveInterval} disabled={saving} className="btn-primary w-full">
          {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      {/* How it works */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Info size={16} className="text-[#B8860B]" />
          <h3 className="font-semibold text-[#1A1208] text-sm">كيف يعمل المفتاح؟</h3>
        </div>
        {[
          ['يوم 0', 'تسجّل دخولك — الساعة تُعاد للصفر'],
          [`يوم ${interval}`, 'انقضى الوقت — يُرسَل تذكير أول'],
          [`يوم ${interval + 3}`, 'لم تستجب — تحذير ثانٍ عاجل'],
          [`يوم ${interval + 7}`, 'يُبلَّغ الشاهد الموثوق لتأكيد الوضع'],
          [`يوم ${interval + 10}+`, 'تُرسَل رسائلك لأحبائك'],
        ].map(([day, action]) => (
          <div key={day} className="flex items-start gap-3">
            <span className="text-[#D4A017] text-xs font-mono mt-0.5 min-w-[70px]">{day}</span>
            <span className="text-[#7A6A52] text-sm">{action}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
