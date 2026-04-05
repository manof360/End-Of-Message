'use client'
// src/app/dashboard/messages/new/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Trash2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

type Recipient = { name: string; email: string; phone: string; channel: 'EMAIL' | 'WHATSAPP' | 'SMS' }

export default function NewMessagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    content: '',
    triggerType: 'SWITCH' as 'SWITCH' | 'DATE' | 'KEYHOLDER',
    scheduledAt: '',
  })
  const [recipients, setRecipients] = useState<Recipient[]>([
    { name: '', email: '', phone: '', channel: 'EMAIL' },
  ])

  const addRecipient = () => {
    if (recipients.length >= 10) return toast.error('الحد الأقصى 10 مستلمين')
    setRecipients([...recipients, { name: '', email: '', phone: '', channel: 'EMAIL' }])
  }

  const removeRecipient = (i: number) => {
    if (recipients.length === 1) return
    setRecipients(recipients.filter((_, idx) => idx !== i))
  }

  const updateRecipient = (i: number, field: keyof Recipient, value: string) => {
    const updated = [...recipients]
    updated[i] = { ...updated[i], [field]: value }
    setRecipients(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.content) return toast.error('يرجى ملء جميع الحقول المطلوبة')
    if (recipients.some(r => !r.name || (!r.email && !r.phone))) {
      return toast.error('يرجى ملء اسم وطريقة التواصل لكل مستلم')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          scheduledAt: form.triggerType === 'DATE' ? form.scheduledAt : null,
          recipients: recipients.map(r => ({
            name: r.name,
            email: r.email || undefined,
            phone: r.phone || undefined,
            channel: r.channel,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'حدث خطأ')
      toast.success('✅ تم حفظ رسالتك وتخزينها في Google Drive')
      router.push('/dashboard/messages')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/messages" className="text-[#7A6A52] hover:text-[#1A1208]">
          <ArrowRight size={20} />
        </Link>
        <div>
          <p className="section-label">رسالة جديدة</p>
          <h1 className="page-title">اكتب رسالتك</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-[#1A1208] text-sm">تفاصيل الرسالة</h2>
          <div>
            <label className="block text-sm text-[#3D2F1A] mb-2">عنوان الرسالة *</label>
            <input
              className="input"
              placeholder="مثال: رسالتي لزوجتي العزيزة"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm text-[#3D2F1A] mb-2">محتوى الرسالة *</label>
            <textarea
              className="input min-h-[200px] resize-y"
              placeholder="اكتب رسالتك هنا..."
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              maxLength={10000}
            />
            <p className="text-[#7A6A52] text-xs mt-1 text-left">{form.content.length}/10000</p>
          </div>
        </div>

        {/* Trigger type */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-[#1A1208] text-sm">متى تُرسَل هذه الرسالة؟</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'SWITCH', label: 'مفتاح الغياب', desc: 'عند انقطاعك عن الموقع' },
              { value: 'DATE', label: 'تاريخ محدد', desc: 'في يوم تحدده أنت' },
              { value: 'KEYHOLDER', label: 'الشاهد الموثوق', desc: 'عند تأكيد الشاهد' },
            ].map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, triggerType: t.value as any })}
                className={`p-3 rounded-xl border text-right transition-all ${
                  form.triggerType === t.value
                    ? 'border-[#D4A017] bg-[#FAF3E0]'
                    : 'border-[rgba(184,134,11,0.2)] hover:border-[#D4A017]'
                }`}
              >
                <p className="text-[#1A1208] text-sm font-medium">{t.label}</p>
                <p className="text-[#7A6A52] text-xs mt-1">{t.desc}</p>
              </button>
            ))}
          </div>

          {form.triggerType === 'DATE' && (
            <div>
              <label className="block text-sm text-[#3D2F1A] mb-2">التاريخ والوقت *</label>
              <input
                type="datetime-local"
                className="input"
                value={form.scheduledAt}
                onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}
        </div>

        {/* Recipients */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#1A1208] text-sm">المستلمون ({recipients.length}/10)</h2>
            <button type="button" onClick={addRecipient} className="btn-secondary text-xs py-2 px-4 flex items-center gap-1">
              <Plus size={14} />
              إضافة مستلم
            </button>
          </div>

          {recipients.map((r, i) => (
            <div key={i} className="bg-[#FDF8F0] border border-[rgba(184,134,11,0.15)] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#B8860B] text-xs font-medium">مستلم {i + 1}</span>
                {recipients.length > 1 && (
                  <button type="button" onClick={() => removeRecipient(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#7A6A52] mb-1">الاسم *</label>
                  <input className="input text-sm py-2" placeholder="اسم المستلم" value={r.name} onChange={e => updateRecipient(i, 'name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-[#7A6A52] mb-1">قناة الإرسال</label>
                  <select className="input text-sm py-2" value={r.channel} onChange={e => updateRecipient(i, 'channel', e.target.value as any)}>
                    <option value="EMAIL">البريد الإلكتروني</option>
                    <option value="WHATSAPP">واتساب</option>
                    <option value="SMS">رسالة نصية</option>
                  </select>
                </div>
              </div>
              {r.channel === 'EMAIL' && (
                <div>
                  <label className="block text-xs text-[#7A6A52] mb-1">البريد الإلكتروني *</label>
                  <input className="input text-sm py-2" type="email" placeholder="example@email.com" value={r.email} onChange={e => updateRecipient(i, 'email', e.target.value)} />
                </div>
              )}
              {(r.channel === 'WHATSAPP' || r.channel === 'SMS') && (
                <div>
                  <label className="block text-xs text-[#7A6A52] mb-1">رقم الهاتف (مع رمز الدولة) *</label>
                  <input className="input text-sm py-2" type="tel" placeholder="+966501234567" value={r.phone} onChange={e => updateRecipient(i, 'phone', e.target.value)} dir="ltr" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Drive notice */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <span className="text-blue-600 text-lg mt-0.5">💾</span>
          <p className="text-blue-800 text-sm">
            ستُحفظ رسالتك تلقائياً في مجلد <strong>وصيتي</strong> في Google Drive الخاص بك كنسخة احتياطية.
          </p>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" /> : null}
            {loading ? 'جارٍ الحفظ...' : 'حفظ الرسالة ✓'}
          </button>
          <Link href="/dashboard/messages" className="btn-secondary px-6">إلغاء</Link>
        </div>
      </form>
    </div>
  )
}
