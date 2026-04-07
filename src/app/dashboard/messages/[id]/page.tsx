// src/app/dashboard/messages/[id]/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Calendar, Users, HardDrive, FileText, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import DeleteMessageButton from './DeleteMessageButton'

const triggerLabels: Record<string, string> = {
  SWITCH: '🔴 مفتاح الغياب', DATE: '📅 تاريخ محدد', KEYHOLDER: '👤 شاهد موثوق'
}
const statusBadge: Record<string, string> = {
  ACTIVE: 'badge-green', SENT: 'badge-gold', DRAFT: 'badge-gray', FAILED: 'badge-red'
}
const statusLabel: Record<string, string> = {
  ACTIVE: 'نشط', SENT: 'أُرسل', DRAFT: 'مسودة', FAILED: 'فشل'
}
const channelLabel: Record<string, string> = {
  EMAIL: '✉️ بريد إلكتروني', WHATSAPP: '💬 واتساب', SMS: '📱 رسالة نصية'
}

export default async function MessageDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const message = await prisma.message.findFirst({
    where: { id: params.id, userId: session!.user.id },
    include: { recipients: true },
  })

  if (!message) notFound()

  return (
    <div className="animate-fade-in max-w-2xl space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/messages" className="text-[#7A6A52] hover:text-[#1A1208]">
          <ArrowRight size={20} />
        </Link>
        <div className="flex-1">
          <p className="section-label">تفاصيل الرسالة</p>
          <h1 className="page-title truncate">{message.title}</h1>
        </div>
        <span className={`badge ${statusBadge[message.status] || 'badge-gray'}`}>
          {statusLabel[message.status] || message.status}
        </span>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={15} className="text-[#B8860B]" />
          <h2 className="font-semibold text-[#1A1208] text-sm">محتوى الرسالة</h2>
        </div>
        <p className="text-[#3D2F1A] text-sm leading-relaxed whitespace-pre-wrap bg-[#FDF8F0] rounded-lg p-4 border border-[rgba(184,134,11,0.15)]">
          {message.content}
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-[#1A1208] text-sm flex items-center gap-2">
          <Calendar size={15} className="text-[#B8860B]" /> وقت الإرسال
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-[#3D2F1A] text-sm">{triggerLabels[message.triggerType]}</span>
          {message.triggerType === 'DATE' && message.scheduledAt && (
            <span className="badge badge-gold">
              {format(new Date(message.scheduledAt), 'dd MMMM yyyy', { locale: ar })} • {format(new Date(message.scheduledAt), 'HH:mm', { locale: ar })}
            </span>
          )}
        </div>
        <div className="text-xs text-[#7A6A52]">
          أُنشئت: {format(new Date(message.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })}
          {message.sentAt && (
            <span className="mr-4">
              أُرسلت: {format(new Date(message.sentAt), 'dd/MM/yyyy HH:mm', { locale: ar })}
            </span>
          )}
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-[#1A1208] text-sm flex items-center gap-2">
          <Users size={15} className="text-[#B8860B]" /> المستلمون ({message.recipients.length})
        </h2>
        <div className="space-y-2">
          {message.recipients.map(r => (
            <div key={r.id} className="flex items-center justify-between bg-[#FDF8F0] rounded-lg px-4 py-3 border border-[rgba(184,134,11,0.1)]">
              <div>
                <p className="text-[#1A1208] text-sm font-medium">{r.name}</p>
                <p className="text-[#7A6A52] text-xs mt-0.5">{r.email || r.phone || '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#7A6A52]">{channelLabel[r.channel]}</span>
                <span className={`badge ${r.status === 'SENT' ? 'badge-green' : r.status === 'FAILED' ? 'badge-red' : 'badge-gray'}`}>
                  {r.status === 'SENT' ? 'أُرسل' : r.status === 'FAILED' ? 'فشل' : 'بانتظار'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {message.driveFileId && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <HardDrive size={16} className="text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-blue-800 text-sm font-medium">محفوظة في Google Drive</p>
            <a href={`https://drive.google.com/file/d/${message.driveFileId}`}
              target="_blank" rel="noreferrer"
              className="text-blue-600 text-xs hover:underline">عرض الملف ←</a>
          </div>
        </div>
      )}

      {message.status !== 'SENT' && (
        <div className="flex items-center gap-3 pt-2">
          <Link href={`/dashboard/messages/${message.id}/edit`}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
            <Pencil size={14} /> تعديل الرسالة
          </Link>
          <DeleteMessageButton messageId={message.id} />
        </div>
      )}
    </div>
  )
}
