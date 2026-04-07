'use client'
// src/app/admin/page.tsx — v1.1.0
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import {
  Users, FileText, Bell, TrendingUp, Search,
  Shield, ChevronLeft, ChevronRight, RefreshCw,
  Crown, UserCheck, Mail, CheckCircle, XCircle, Send
} from 'lucide-react'
import toast from 'react-hot-toast'

const APP_VERSION = '1.1.0'

type Stats = {
  totalUsers: number; activeUsers: number; totalMessages: number
  sentMessages: number; triggeredSwitches: number; newUsersThisMonth: number
}
type UserRow = {
  id: string; name: string | null; email: string | null; image: string | null
  plan: string; role: string; switchStatus: string; switchEnabled: boolean
  createdAt: string; lastLoginAt: string; _count: { messages: number }
}

const switchColors: Record<string, string> = {
  ACTIVE: 'badge-green', WARNING: 'badge-yellow',
  CRITICAL: 'badge-red', TRIGGERED: 'badge-red', PAUSED: 'badge-gray'
}
const switchLabels: Record<string, string> = {
  ACTIVE: 'نشط', WARNING: 'تحذير', CRITICAL: 'حرج', TRIGGERED: 'مُفعَّل', PAUSED: 'متوقف'
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  // Email test state
  const [testEmail, setTestEmail] = useState('')
  const [emailTesting, setEmailTesting] = useState(false)
  const [emailResult, setEmailResult] = useState<'success' | 'fail' | null>(null)

  const totalPages = Math.ceil(total / 20)

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true)
    try {
      const [sRes, uRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}&plan=${planFilter}`),
      ])
      const [sData, uData] = await Promise.all([sRes.json(), uRes.json()])
      if (sData.success) setStats(sData.data.stats)
      if (uData.success) { setUsers(uData.data.users); setTotal(uData.data.total) }
    } catch { toast.error('خطأ في تحميل البيانات') }
    finally { setLoading(false); setRefreshing(false) }
  }, [page, search, planFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const updateUser = async (userId: string, data: { plan?: string; role?: string }) => {
    setUpdating(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...data }),
      })
      const json = await res.json()
      if (json.success) {
        setUsers(u => u.map(usr => usr.id === userId ? { ...usr, ...data } : usr))
        toast.success('تم التحديث')
      } else throw new Error(json.error)
    } catch (e: any) { toast.error(e.message || 'فشل التحديث') }
    finally { setUpdating(null) }
  }

  const sendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) return toast.error('أدخل بريداً إلكترونياً صحيحاً')
    setEmailTesting(true); setEmailResult(null)
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      })
      const json = await res.json()
      if (json.success) {
        setEmailResult('success')
        toast.success('✅ تم الإرسال! تحقق من بريدك')
      } else {
        setEmailResult('fail')
        toast.error(`فشل الإرسال: ${json.error}`)
      }
    } catch {
      setEmailResult('fail')
      toast.error('خطأ في الاتصال')
    } finally { setEmailTesting(false) }
  }

  const statCards = stats ? [
    { label: 'إجمالي المستخدمين', value: stats.totalUsers, icon: Users, sub: `+${stats.newUsersThisMonth} هذا الشهر`, color: 'text-[#D4A017]' },
    { label: 'مستخدمون نشطون', value: stats.activeUsers, icon: UserCheck, sub: 'مفتاح نشط', color: 'text-green-400' },
    { label: 'إجمالي الرسائل', value: stats.totalMessages, icon: FileText, sub: `${stats.sentMessages} أُرسلت`, color: 'text-blue-400' },
    { label: 'مفاتيح مُفعَّلة', value: stats.triggeredSwitches, icon: Bell, sub: 'تم إرسال الرسائل', color: 'text-red-400' },
    { label: 'جدد هذا الشهر', value: stats.newUsersThisMonth, icon: TrendingUp, sub: 'مستخدم جديد', color: 'text-purple-400' },
    { label: 'الرسائل المُرسَلة', value: stats.sentMessages, icon: FileText, sub: `من ${stats.totalMessages}`, color: 'text-[#D4A017]' },
  ] : []

  return (
    <div className="animate-fade-in w-full max-w-7xl mx-auto space-y-6 md:space-y-8 px-4 sm:px-6 md:px-0" dir="rtl">

      {/* Header with version */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 bg-[#1A1208] rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-[#D4A017] md:w-[18px] md:h-[18px]" />
          </div>
          <div>
            <p className="section-label text-xs md:text-sm">لوحة الإدارة</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <h1 className="page-title text-2xl md:text-3xl">إدارة وصيتي</h1>
              <span className="badge badge-gold text-xs w-fit">v{APP_VERSION}</span>
            </div>
          </div>
        </div>
        <button onClick={() => fetchData(true)}
          className="btn-secondary text-xs md:text-sm flex items-center gap-2 py-2.5 md:py-3 px-3 md:px-4 w-full sm:w-auto justify-center">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
        {loading && !stats
          ? [...Array(6)].map((_, i) => <div key={i} className="stat-card animate-pulse h-20 md:h-24" />)
          : statCards.map(({ label, value, icon: Icon, sub, color }) => (
            <div key={label} className="stat-card text-right p-3 md:p-5">
              <div className="flex items-start justify-between mb-2 md:mb-3">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-[rgba(184,134,11,0.15)] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={12} className="text-[#D4A017] md:w-[14px] md:h-[14px]" />
                </div>
                <div className={`text-2xl md:text-3xl font-bold ${color}`}>{value.toLocaleString('ar')}</div>
              </div>
              <p className="text-[rgba(253,248,240,0.8)] text-xs md:text-sm font-medium">{label}</p>
              <p className="text-[rgba(253,248,240,0.35)] text-xs mt-0.5">{sub}</p>
            </div>
          ))
        }
      </div>

      {/* Email Test Section */}
      <div className="card space-y-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-[#B8860B] md:w-[16px] md:h-[16px]" />
          <h2 className="font-semibold text-[#1A1208] text-sm md:text-base">اختبار إرسال الإيميل</h2>
        </div>
        <p className="text-[#7A6A52] text-xs md:text-sm">تحقق من أن نظام الإيميل يعمل بشكل صحيح</p>

        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <input
            type="email"
            className="input flex-1 text-xs md:text-sm py-2.5 md:py-3"
            placeholder="أدخل بريدك الإلكتروني للاختبار..."
            value={testEmail}
            onChange={e => { setTestEmail(e.target.value); setEmailResult(null) }}
            dir="ltr"
          />
          <button
            onClick={sendTestEmail}
            disabled={emailTesting}
            className="btn-primary flex items-center gap-2 text-xs md:text-sm px-4 md:px-5 py-2.5 md:py-3 whitespace-nowrap w-full sm:w-auto justify-center"
          >
            {emailTesting
              ? <RefreshCw size={12} className="animate-spin md:w-[14px] md:h-[14px]" />
              : <Send size={12} />
            }
            {emailTesting ? 'جارٍ الإرسال...' : 'إرسال تجريبي'}
          </button>
        </div>

        {emailResult && (
          <div className={`flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg md:rounded-xl text-xs md:text-sm ${
            emailResult === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {emailResult === 'success'
              ? <CheckCircle size={14} className="text-green-600 flex-shrink-0 md:w-[16px] md:h-[16px]" />
              : <XCircle size={14} className="text-red-600 flex-shrink-0 md:w-[16px] md:h-[16px]" />
            }
            {emailResult === 'success'
              ? `✅ الإيميل أُرسل بنجاح إلى ${testEmail} — تحقق من صندوق الوارد (أو Spam)`
              : '❌ فشل الإرسال — تحقق من RESEND_API_KEY في Vercel'
            }
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6A52] md:w-[15px] md:h-[15px]" />
          <input className="input pr-10 text-xs md:text-sm py-2.5 md:py-3 w-full" placeholder="بحث بالاسم أو البريد..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input text-xs md:text-sm py-2.5 md:py-3 w-full sm:w-auto min-w-[120px] md:min-w-[130px]"
          value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1) }}>
          <option value="">كل الخطط</option>
          <option value="FREE">مجاني</option>
          <option value="BASIC">أساسي</option>
          <option value="PREMIUM">بريميوم</option>
        </select>
        <span className="text-[#7A6A52] text-xs md:text-sm whitespace-nowrap">{total.toLocaleString('ar')} مستخدم</span>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(184,134,11,0.15)] bg-[#F5EDD8]">
                {['المستخدم', 'الخطة', 'المفتاح', 'الرسائل', 'آخر دخول', 'الصلاحية'].map(h => (
                  <th key={h} className="text-right text-xs text-[#7A6A52] font-medium px-3 md:px-5 py-2.5 md:py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-3 md:px-5 py-3 md:py-4">
                        <div className="h-4 bg-[#F5EDD8] rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
                : users.length === 0
                  ? <tr><td colSpan={6} className="text-center py-8 md:py-12 text-[#7A6A52] text-xs md:text-sm">لا توجد نتائج</td></tr>
                  : users.map(user => (
                    <tr key={user.id} className="border-b border-[rgba(184,134,11,0.08)] hover:bg-[#FAF3E0] transition-colors">
                      <td className="px-3 md:px-5 py-3 md:py-4">
                        <div className="flex items-center gap-2 md:gap-3">
                          {user.image
                            ? <Image src={user.image} alt="" width={32} height={32} className="rounded-full flex-shrink-0 w-8 h-8" />
                            : <div className="w-8 h-8 bg-[#FAF3E0] rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-[#B8860B] text-xs font-bold">
                                  {(user.name || user.email || '?')[0].toUpperCase()}
                                </span>
                              </div>
                          }
                          <div className="min-w-0">
                            <p className="text-[#1A1208] text-xs md:text-sm font-medium truncate max-w-[120px] md:max-w-[150px] flex items-center gap-1">
                              {user.name || 'بدون اسم'}
                              {user.role === 'ADMIN' && <Crown size={10} className="text-[#D4A017] flex-shrink-0 md:w-[11px] md:h-[11px]" />}
                            </p>
                            <p className="text-[#7A6A52] text-[10px] md:text-xs truncate max-w-[120px] md:max-w-[150px]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-5 py-3 md:py-4">
                        <select
                          className="text-[10px] md:text-xs border border-[rgba(184,134,11,0.25)] rounded-lg px-2 py-1.5 bg-white text-[#1A1208] cursor-pointer hover:border-[#D4A017] disabled:opacity-40 transition-colors"
                          value={user.plan} disabled={updating === user.id}
                          onChange={e => updateUser(user.id, { plan: e.target.value })}>
                          <option value="FREE">مجاني</option>
                          <option value="BASIC">أساسي</option>
                          <option value="PREMIUM">بريميوم</option>
                        </select>
                      </td>
                      <td className="px-3 md:px-5 py-3 md:py-4">
                        <span className={`badge ${switchColors[user.switchStatus] || 'badge-gray'} text-xs`}>
                          {switchLabels[user.switchStatus] || user.switchStatus}
                        </span>
                      </td>
                      <td className="px-3 md:px-5 py-3 md:py-4">
                        <span className="text-[#1A1208] text-xs md:text-sm font-semibold">{user._count.messages}</span>
                      </td>
                      <td className="px-3 md:px-5 py-3 md:py-4">
                        <span className="text-[#7A6A52] text-[10px] md:text-xs">
                          {formatDistanceToNow(new Date(user.lastLoginAt), { locale: ar, addSuffix: true })}
                        </span>
                      </td>
                      <td className="px-3 md:px-5 py-3 md:py-4">
                        <select
                          className="text-[10px] md:text-xs border border-[rgba(184,134,11,0.25)] rounded-lg px-2 py-1.5 bg-white text-[#1A1208] cursor-pointer hover:border-[#D4A017] disabled:opacity-40 transition-colors"
                          value={user.role} disabled={updating === user.id}
                          onChange={e => updateUser(user.id, { role: e.target.value })}>
                          <option value="USER">مستخدم</option>
                          <option value="ADMIN">أدمن</option>
                        </select>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4 px-3 md:px-5 py-3 md:py-4 border-t border-[rgba(184,134,11,0.1)] bg-[#FEFCF8]">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 text-xs md:text-sm text-[#7A6A52] disabled:opacity-30 hover:text-[#1A1208] order-2 sm:order-1">
              <ChevronRight size={14} className="md:w-[16px] md:h-[16px]" /> السابق
            </button>
            <div className="flex items-center justify-center gap-1 md:gap-2 order-1 sm:order-2">
              {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                <button key={i+1} onClick={() => setPage(i+1)}
                  className={`w-7 h-7 md:w-8 md:h-8 rounded-lg text-xs transition-colors ${
                    page === i+1 ? 'bg-[#1A1208] text-[#D4A017]' : 'text-[#7A6A52] hover:bg-[#F5EDD8]'
                  }`}>{i+1}</button>
              ))}
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="flex items-center gap-1 text-xs md:text-sm text-[#7A6A52] disabled:opacity-30 hover:text-[#1A1208] order-3">
              التالي <ChevronLeft size={14} className="md:w-[16px] md:h-[16px]" />
            </button>
          </div>
        )}
      </div>

      {/* Version footer */}
      <div className="text-center text-[#7A6A52] text-xs py-2">
        وصيتي — الإصدار {APP_VERSION} · {new Date().getFullYear()}
      </div>
    </div>
  )
}
