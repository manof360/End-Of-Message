// src/app/dashboard/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FileText, Users, Bell, HardDrive, Plus, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)!
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: {
      messages: { include: { recipients: true }, orderBy: { createdAt: 'desc' }, take: 5 },
      keyholders: true,
      switchLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
      _count: { select: { messages: true } },
    },
  })

  if (!user) return null

  const planLimits = { FREE: 1, BASIC: 5, PREMIUM: 999 }
  const msgLimit = planLimits[user.plan as keyof typeof planLimits] ?? 1
  const msgCount = user._count.messages

  const statusColors: Record<string, string> = {
    ACTIVE: 'badge-green', WARNING: 'badge-yellow',
    CRITICAL: 'badge-red', TRIGGERED: 'badge-red',
    PAUSED: 'badge-gray',
  }
  const statusLabels: Record<string, string> = {
    ACTIVE: 'نشط', WARNING: 'تحذير',
    CRITICAL: 'حرج', TRIGGERED: 'تم الإرسال',
    PAUSED: 'متوقف',
  }

  return (
    <div className="animate-fade-in space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="section-label text-xs">لوحة التحكم</p>
          <h1 className="page-title text-lg md:text-2xl">أهلاً، {user.name?.split(' ')[0]} 👋</h1>
          <p className="text-[#7A6A52] text-xs md:text-sm mt-1">
            آخر تسجيل دخول: {formatDistanceToNow(new Date(user.lastLoginAt), { locale: ar, addSuffix: true })}
          </p>
        </div>
        <Link href="/dashboard/messages/new" className="btn-primary flex items-center justify-center gap-2 text-xs md:text-sm py-2 md:py-3 px-3 md:px-4 w-full sm:w-auto">
          <Plus size={16} />
          رسالة جديدة
        </Link>
      </div>

      {/* Critical warning if switch is critical */}
      {user.switchStatus === 'CRITICAL' && (
        <div className="bg-red-50 border border-red-200 rounded-lg md:rounded-xl p-3 md:p-4 flex items-start gap-2 md:gap-3">
          <AlertTriangle className="text-red-600 mt-0.5 flex-shrink-0" size={18} />
          <div className="min-w-0">
            <p className="text-red-800 font-medium text-xs md:text-sm">تحذير: لم تسجّل دخولك منذ فترة طويلة</p>
            <p className="text-red-600 text-xs mt-1">سيتم إبلاغ الشاهد الموثوق قريباً. سجّل دخولك للإلغاء.</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4">
        <div className="stat-card text-xs md:text-sm">
          <div className="text-2xl md:text-3xl font-bold text-[#D4A017]">{msgCount}</div>
          <div className="text-[rgba(253,248,240,0.5)] text-xs mt-1">من {msgLimit}</div>
          <div className="text-[rgba(253,248,240,0.8)] text-xs md:text-sm mt-2">رسائلي</div>
        </div>
        <div className="stat-card text-xs md:text-sm">
          <div className="text-2xl md:text-3xl font-bold text-[#D4A017]">{user.keyholders.length}</div>
          <div className="text-[rgba(253,248,240,0.5)] text-xs mt-1">شاهد</div>
          <div className="text-[rgba(253,248,240,0.8)] text-xs md:text-sm mt-2">الشهود</div>
        </div>
        <div className="stat-card text-xs md:text-sm">
          <div className="text-2xl md:text-3xl font-bold text-[#D4A017]">{user.switchIntervalDays}</div>
          <div className="text-[rgba(253,248,240,0.5)] text-xs mt-1">يوم</div>
          <div className="text-[rgba(253,248,240,0.8)] text-xs md:text-sm mt-2">المفتاح</div>
        </div>
        <div className="stat-card text-xs md:text-sm">
          <span className={`badge ${statusColors[user.switchStatus] || 'badge-gray'} text-xs`}>
            {statusLabels[user.switchStatus] || user.switchStatus}
          </span>
          <div className="text-[rgba(253,248,240,0.8)] text-xs md:text-sm mt-3">الحالة</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4">
        {[
          { href: '/dashboard/messages/new', icon: FileText, label: 'رسالة', desc: 'جديدة' },
          { href: '/dashboard/keyholders', icon: Users, label: 'شاهد', desc: 'موثوق' },
          { href: '/dashboard/switch', icon: Bell, label: 'المفتاح', desc: 'الذكي' },
          { href: '/dashboard/drive', icon: HardDrive, label: 'Drive', desc: 'المحفوظات' },
        ].map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href} className="card-elevated group text-center hover:scale-[1.01] transition-transform p-3 md:p-4">
            <div className="w-8 md:w-10 h-8 md:h-10 bg-[#FAF3E0] rounded-lg md:rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:bg-[#D4A017] transition-colors">
              <Icon size={16} className="text-[#B8860B] group-hover:text-[#1A1208] transition-colors" />
            </div>
            <p className="text-[#1A1208] text-xs md:text-sm font-medium">{label}</p>
            <p className="text-[#7A6A52] text-xs mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent messages */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="font-semibold text-[#1A1208] text-sm md:text-base">آخر الرسائل</h2>
          <Link href="/dashboard/messages" className="text-[#B8860B] text-xs md:text-sm hover:underline">
            عرض الكل
          </Link>
        </div>

        {user.messages.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <FileText className="w-8 md:w-10 h-8 md:h-10 text-[#7A6A52] mx-auto mb-3 opacity-40" />
            <p className="text-[#7A6A52] text-xs md:text-sm">لا توجد رسائل بعد</p>
            <Link href="/dashboard/messages/new" className="btn-primary text-xs md:text-sm mt-4 inline-block py-2 px-4">
              أنشئ رسالتك الأولى
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {user.messages.map(msg => (
              <Link
                key={msg.id}
                href={`/dashboard/messages/${msg.id}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 md:p-3 rounded-lg hover:bg-[#FAF3E0] transition-colors group"
              >
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <div className="w-8 h-8 bg-[#FAF3E0] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#F5EDD8]">
                    <FileText size={14} className="text-[#B8860B]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#1A1208] text-xs md:text-sm font-medium truncate">{msg.title}</p>
                    <p className="text-[#7A6A52] text-xs">
                      {msg.recipients.length} مستلم · {formatDistanceToNow(new Date(msg.createdAt), { locale: ar, addSuffix: true })}
                    </p>
                  </div>
                </div>
                <span className={`badge ${msg.status === 'ACTIVE' ? 'badge-green' : msg.status === 'SENT' ? 'badge-gold' : 'badge-gray'} text-xs flex-shrink-0`}>
                  {msg.status === 'ACTIVE' ? 'نشط' : msg.status === 'SENT' ? 'أُرسل' : 'مسودة'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
