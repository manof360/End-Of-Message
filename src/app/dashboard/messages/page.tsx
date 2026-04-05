// src/app/dashboard/messages/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus, FileText, Calendar, Users, HardDrive } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ar } from 'date-fns/locale'

const triggerLabels: Record<string, string> = {
  SWITCH: 'مفتاح الغياب', DATE: 'تاريخ محدد', KEYHOLDER: 'شاهد موثوق'
}
const statusBadge: Record<string, string> = {
  ACTIVE: 'badge-green', SENT: 'badge-gold', DRAFT: 'badge-gray', FAILED: 'badge-red'
}
const statusLabel: Record<string, string> = {
  ACTIVE: 'نشط', SENT: 'أُرسل', DRAFT: 'مسودة', FAILED: 'فشل'
}

export default async function MessagesPage() {
  const session = await getServerSession(authOptions)!
  const messages = await prisma.message.findMany({
    where: { userId: session!.user.id },
    include: { recipients: true },
    orderBy: { createdAt: 'desc' },
  })

  const planLimits = { FREE: 1, BASIC: 5, PREMIUM: 999 }
  const limit = planLimits[session!.user.plan as keyof typeof planLimits] ?? 1

  return (
    <div className="animate-fade-in space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">رسائلي</p>
          <h1 className="page-title">الرسائل والوصايا</h1>
          <p className="text-[#7A6A52] text-sm">{messages.length} من {limit} رسائل</p>
        </div>
        {messages.length < limit && (
          <Link href="/dashboard/messages/new" className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> رسالة جديدة
          </Link>
        )}
      </div>

      {/* Plan limit warning */}
      {messages.length >= limit && session!.user.plan === 'FREE' && (
        <div className="bg-[#FAF3E0] border border-[rgba(184,134,11,0.3)] rounded-xl p-4 flex items-center justify-between">
          <p className="text-[#3D2F1A] text-sm">وصلت للحد الأقصى في الخطة المجانية</p>
          <Link href="/dashboard/settings" className="btn-primary text-xs py-2 px-4">ترقية الحساب</Link>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="w-12 h-12 text-[#7A6A52] mx-auto mb-4 opacity-30" />
          <h3 className="text-[#1A1208] font-medium mb-2">لا توجد رسائل بعد</h3>
          <p className="text-[#7A6A52] text-sm mb-6">ابدأ بكتابة رسالتك الأولى لأحبائك</p>
          <Link href="/dashboard/messages/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> أنشئ رسالة
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => (
            <Link
              key={msg.id}
              href={`/dashboard/messages/${msg.id}`}
              className="card-elevated flex items-center gap-4 group"
            >
              <div className="w-12 h-12 bg-[#FAF3E0] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#D4A017] transition-colors">
                <FileText size={20} className="text-[#B8860B] group-hover:text-[#1A1208] transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[#1A1208] font-medium truncate">{msg.title}</h3>
                  <span className={`badge ${statusBadge[msg.status] || 'badge-gray'} flex-shrink-0`}>
                    {statusLabel[msg.status] || msg.status}
                  </span>
                </div>
                <p className="text-[#7A6A52] text-sm line-clamp-1">{msg.content}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-[#7A6A52]">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {triggerLabels[msg.triggerType]}
                    {msg.triggerType === 'DATE' && msg.scheduledAt && (
                      <span className="text-[#B8860B]"> · {format(new Date(msg.scheduledAt), 'dd/MM/yyyy', { locale: ar })}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {msg.recipients.length} مستلم
                  </span>
                  {msg.driveFileId && (
                    <span className="flex items-center gap-1 text-blue-500">
                      <HardDrive size={12} /> محفوظ في Drive
                    </span>
                  )}
                  <span>{formatDistanceToNow(new Date(msg.createdAt), { locale: ar, addSuffix: true })}</span>
                </div>
              </div>
              <div className="text-[#7A6A52] group-hover:text-[#B8860B] transition-colors">←</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
