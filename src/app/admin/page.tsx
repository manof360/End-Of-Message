'use client'
// src/app/admin/page.tsx
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import {
  Users, FileText, Bell, TrendingUp, Search,
  Shield, ChevronLeft, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

type Stats = {
  totalUsers: number; activeUsers: number; totalMessages: number
  sentMessages: number; triggeredSwitches: number; newUsersThisMonth: number
}
type User = {
  id: string; name: string | null; email: string | null; image: string | null
  plan: string; role: string; switchStatus: string; switchEnabled: boolean
  createdAt: string; lastLoginAt: string; _count: { messages: number }
}

const planColors: Record<string, string> = {
  FREE: 'badge-gray', BASIC: 'badge-gold', PREMIUM: 'badge-green'
}
const planLabels: Record<string, string> = {
  FREE: 'مجاني', BASIC: 'أساسي', PREMIUM: 'بريميوم'
}
const statusColors: Record<string, string> = {
  ACTIVE: 'badge-green', WARNING: 'badge-yellow',
  CRITICAL: 'badge-red', TRIGGERED: 'badge-red', PAUSED: 'badge-gray'
}
const statusLabels: Record<string, string> = {
  ACTIVE: 'نشط', WARNING: 'تحذير',
  CRITICAL: 'حرج', TRIGGERED: 'مُفعَّل', PAUSED: 'متوقف'
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)

  const totalPages = Math.ceil(total / 20)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch(`/api/admin/users?page=${page}&search=${search}&plan=${planFilter}`),
      ])
      const statsData = await statsRes.json()
      const usersData = await usersRes.json()
      if (statsData.success) {
        setStats(statsData.data.stats)
      }
      if (usersData.success) {
        setUsers(usersData.data.users)
        setTotal(usersData.data.total)
      }
    } catch (e) {
      toast.error('خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, search, planFilter])

  const updateUserPlan = async (userId: string, plan: string) => {
    setUpdatingUser(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('تم تحديث الخطة')
        setUsers(users.map(u => u.id === userId ? { ...u, plan } : u))
      }
    } catch { toast.error('فشل التحديث') }
    finally { setUpdatingUser(null) }
  }

  const updateUserRole = async (userId: string, role: string) => {
    setUpdatingUser(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('تم تحديث الصلاحية')
        setUsers(users.map(u => u.id === userId ? { ...u, role } : u))
      }
    } catch { toast.error('فشل التحديث') }
    finally { setUpdatingUser(null) }
  }

  return (
    <div className="animate-fade-in space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#1A1208] rounded-xl flex items-center justify-center">
          <Shield size={18} className="text-[#D4A017]" />
        </div>
        <div>
          <p className="section-label">لوحة الإدارة</p>
          <h1 className="page-title">إدارة وصيتي</h1>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'إجمالي المستخدمين', value: stats.totalUsers, icon: Users, sub: `+${stats.newUsersThisMonth} هذا الشهر` },
            { label: 'مستخدمون نشطون', value: stats.activeUsers, icon: TrendingUp, sub: 'مفتاح نشط' },
            { label: 'إجمالي الرسائل', value: stats.totalMessages, icon: FileText, sub: `${stats.sentMessages} أُرسل` },
            { label: 'مفاتيح مُفعَّلة', value: stats.triggeredSwitches, icon: Bell, sub: 'تم الإرسال' },
            { label: 'جدد هذا الشهر', value: stats.newUsersThisMonth, icon: Users, sub: 'مستخدم جديد' },
            { label: 'الرسائل المُرسَلة', value: stats.sentMessages, icon: FileText, sub: 'من إجمالي ' + stats.totalMessages },
          ].map(({ label, value, icon: Icon, sub }) => (
            <div key={label} className="stat-card text-right">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 bg-[rgba(184,134,11,0.15)] rounded-lg flex items-center justify-center">
                  <Icon size={14} className="text-[#D4A017]" />
                </div>
                <div className="text-3xl font-bold text-[#D4A017]">{value.toLocaleString('ar')}</div>
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
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6A52]" />
          <input
            className="input pr-10 text-sm py-2"
            placeholder="بحث بالاسم أو البريد..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="input text-sm py-2 w-auto"
          value={planFilter}
          onChange={e => { setPlanFilter(e.target.value); setPage(1) }}
        >
          <option value="">كل الخطط</option>
          <option value="FREE">مجاني</option>
          <option value="BASIC">أساسي</option>
          <option value="PREMIUM">بريميوم</option>
        </select>
        <span className="text-[#7A6A52] text-sm">{total} مستخدم</span>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(184,134,11,0.15)] bg-[#F5EDD8]">
                <th className="text-right text-xs text-[#7A6A52] font-medium px-5 py-3">المستخدم</th>
                <th className="text-right text-xs text-[#7A6A52] font-medium px-5 py-3">الخطة</th>
                <th className="text-right text-xs text-[#7A6A52] font-medium px-5 py-3">المفتاح</th>
                <th className="text-right text-xs text-[#7A6A52] font-medium px-5 py-3">الرسائل</th>
                <th className="text-right text-xs text-[#7A6A52] font-medium px-5 py-3">آخر دخول</th>
                <th className="text-right text-xs text-[#7A6A52] font-medium px-5 py-3">الصلاحية</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-[#7A6A52]">جارٍ التحميل...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[#7A6A52]">لا توجد نتائج</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-b border-[rgba(184,134,11,0.08)] hover:bg-[#FAF3E0] transition-colors">
                  {/* User info */}
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
                        <p className="text-[#1A1208] text-sm font-medium truncate max-w-[160px]">
                          {user.name || 'بدون اسم'}
                        </p>
                        <p className="text-[#7A6A52] text-xs truncate max-w-[160px]">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Plan */}
                  <td className="px-5 py-4">
                    <select
                      className="text-xs border border-[rgba(184,134,11,0.2)] rounded-lg px-2 py-1 bg-transparent text-[#1A1208] disabled:opacity-50"
                      value={user.plan}
                      disabled={updatingUser === user.id}
                      onChange={e => updateUserPlan(user.id, e.target.value)}
                    >
                      <option value="FREE">مجاني</option>
                      <option value="BASIC">أساسي</option>
                      <option value="PREMIUM">بريميوم</option>
                    </select>
                  </td>

                  {/* Switch status */}
                  <td className="px-5 py-4">
                    <span className={`badge ${statusColors[user.switchStatus] || 'badge-gray'}`}>
                      {statusLabels[user.switchStatus] || user.switchStatus}
                    </span>
                  </td>

                  {/* Message count */}
                  <td className="px-5 py-4">
                    <span className="text-[#1A1208] text-sm font-medium">{user._count.messages}</span>
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
                      className="text-xs border border-[rgba(184,134,11,0.2)] rounded-lg px-2 py-1 bg-transparent text-[#1A1208] disabled:opacity-50"
                      value={user.role}
                      disabled={updatingUser === user.id}
                      onChange={e => updateUserRole(user.id, e.target.value)}
                    >
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
          <div className="flex items-center justify-between px-5 py-4 border-t border-[rgba(184,134,11,0.1)]">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-sm text-[#7A6A52] disabled:opacity-30 hover:text-[#1A1208]"
            >
              <ChevronRight size={16} /> السابق
            </button>
            <span className="text-[#7A6A52] text-sm">
              صفحة {page} من {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-sm text-[#7A6A52] disabled:opacity-30 hover:text-[#1A1208]"
            >
              التالي <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
