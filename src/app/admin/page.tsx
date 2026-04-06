'use client'
// src/app/admin/page.tsx
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import {
  Users, FileText, Bell, TrendingUp,
  Search, Shield, ChevronLeft, ChevronRight,
  RefreshCw, Crown, UserCheck
} from 'lucide-react'
import toast from 'react-hot-toast'

type Stats = {
  totalUsers: number; activeUsers: number; totalMessages: number
  sentMessages: number; triggeredSwitches: number; newUsersThisMonth: number
}
type UserRow = {
  id: string; name: string | null; email: string | null; image: string | null
  plan: string; role: string; switchStatus: string; switchEnabled: boolean
  createdAt: string; lastLoginAt: string; _count: { messages: number }
}

const planColors: Record<string, string> = { FREE: 'badge-gray', BASIC: 'badge-gold', PREMIUM: 'badge-green' }
const planLabels: Record<string, string> = { FREE: 'مجاني', BASIC: 'أساسي', PREMIUM: 'بريميوم' }
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

  const totalPages = Math.ceil(total / 20)

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
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

  const statCards = stats ? [
    { label: 'إجمالي المستخدمين', value: stats.totalUsers, icon: Users, sub: `+${stats.newUsersThisMonth} هذا الشهر`, color: 'text-[#D4A017]' },
    { label: 'مستخدمون نشطون', value: stats.activeUsers, icon: UserCheck, sub: 'مفتاح نشط', color: 'text-green-400' },
    { label: 'إجمالي الرسائل', value: stats.totalMessages, icon: FileText, sub: `${stats.sentMessages} أُرسلت`, color: 'text-blue-400' },
    { label: 'مفاتيح مُفعَّلة', value: stats.triggeredSwitches, icon: Bell, sub: 'تم إرسال الرسائل', color: 'text-red-400' },
    { label: 'جدد هذا الشهر', value: stats.newUsersThisMonth, icon: TrendingUp, sub: 'مستخدم جديد', color: 'text-purple-400' },
    { label: 'الرسائل المُرسَلة', value: stats.sentMessages, icon: FileText, sub: `من ${stats.totalMessages}`, color: 'text-[#D4A017]' },
  ] : []

  return (
    <div className="animate-fade-in space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1A1208] rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-[#D4A017]" />
          </div>
          <div>
            <p className="section-label">لوحة الإدارة</p>
            <h1 className="page-title">إدارة وصيتي</h1>
          </div>
        </div>
        <button onClick={() => fetchData(true)}
          className="btn-secondary text-sm flex items-center gap-2 py-2 px-4">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* Stats */}
      {loading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map(({ label, value, icon: Icon, sub, color }) => (
            <div key={label} className="stat-card text-right">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 bg-[rgba(184,134,11,0.15)] rounded-lg flex items-center justify-center">
                  <Icon size={14} className="text-[#D4A017]" />
                </div>
                <div className={`text-3xl font-bold ${color}`}>{value.toLocaleString('ar')}</div>
              </div>
              <p className="text-[rgba(253,248,240,0.8)] text-sm font-medium">{label}</p>
              <p className="text-[rgba(253,248,240,0.35)] text-xs mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6A52]" />
          <input className="input pr-10 text-sm py-2.5" placeholder="بحث بالاسم أو البريد..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input text-sm py-2.5 w-auto min-w-[130px]"
          value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1) }}>
          <option value="">كل الخطط</option>
          <option value="FREE">مجاني</option>
          <option value="BASIC">أساسي</option>
          <option value="PREMIUM">بريميوم</option>
        </select>
        <span className="text-[#7A6A52] text-sm whitespace-nowrap">{total.toLocaleString('ar')} مستخدم</span>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(184,134,11,0.15)] bg-[#F5EDD8]">
                {['المستخدم', 'الخطة', 'المفتاح', 'الرسائل', 'آخر دخول', 'الصلاحية'].map(h => (
                  <th key={h} className="text-right text-xs text-[#7A6A52] font-medium px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-[#F5EDD8] rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#7A6A52]">لا توجد نتائج</td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id}
                  className="border-b border-[rgba(184,134,11,0.08)] hover:bg-[#FAF3E0] transition-colors">

                  {/* User */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <Image src={user.image} alt="" width={32} height={32} className="rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 bg-[#FAF3E0] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-[#B8860B] text-xs font-bold">
                            {(user.name || user.email || '?')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[#1A1208] text-sm font-medium truncate max-w-[150px]">
                          {user.name || 'بدون اسم'}
                          {user.role === 'ADMIN' && <Crown size={12} className="inline mr-1 text-[#D4A017]" />}
                        </p>
                        <p className="text-[#7A6A52] text-xs truncate max-w-[150px]">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Plan */}
                  <td className="px-5 py-4">
                    <select
                      className="text-xs border border-[rgba(184,134,11,0.25)] rounded-lg px-2 py-1.5 bg-white text-[#1A1208] cursor-pointer hover:border-[#D4A017] disabled:opacity-40 transition-colors"
                      value={user.plan}
                      disabled={updating === user.id}
                      onChange={e => updateUser(user.id, { plan: e.target.value })}>
                      <option value="FREE">مجاني</option>
                      <option value="BASIC">أساسي</option>
                      <option value="PREMIUM">بريميوم</option>
                    </select>
                  </td>

                  {/* Switch status */}
                  <td className="px-5 py-4">
                    <span className={`badge ${switchColors[user.switchStatus] || 'badge-gray'}`}>
                      {switchLabels[user.switchStatus] || user.switchStatus}
                    </span>
                  </td>

                  {/* Messages count */}
                  <td className="px-5 py-4">
                    <span className="text-[#1A1208] text-sm font-semibold">{user._count.messages}</span>
                  </td>

                  {/* Last login */}
                  <td className="px-5 py-4">
                    <span className="text-[#7A6A52] text-xs">
                      {formatDistanceToNow(new Date(user.lastLoginAt), { locale: ar, addSuffix: true })}
                    </span>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-4">
                    <select
                      className="text-xs border border-[rgba(184,134,11,0.25)] rounded-lg px-2 py-1.5 bg-white text-[#1A1208] cursor-pointer hover:border-[#D4A017] disabled:opacity-40 transition-colors"
                      value={user.role}
                      disabled={updating === user.id}
                      onChange={e => updateUser(user.id, { role: e.target.value })}>
                      <option value="USER">مستخدم</option>
                      <option value="ADMIN">أدمن</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-[rgba(184,134,11,0.1)] bg-[#FEFCF8]">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 text-sm text-[#7A6A52] disabled:opacity-30 hover:text-[#1A1208] transition-colors">
              <ChevronRight size={16} /> السابق
            </button>
            <div className="flex items-center gap-2">
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                const p = i + 1
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                      page === p ? 'bg-[#1A1208] text-[#D4A017]' : 'text-[#7A6A52] hover:bg-[#F5EDD8]'
                    }`}>{p}</button>
                )
              })}
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="flex items-center gap-1 text-sm text-[#7A6A52] disabled:opacity-30 hover:text-[#1A1208] transition-colors">
              التالي <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
