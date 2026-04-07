'use client'
// src/app/dashboard/messages/[id]/edit/page.tsx
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Trash2, ArrowRight, Save } from 'lucide-react'
import Link from 'next/link'

type Recipient = { id?: string; name: string; email: string; phone: string; channel: 'EMAIL' | 'WHATSAPP' | 'SMS'; isKeyholder?: boolean }

export default function EditMessagePage() {
  const router = useRouter()
  const params = useParams()
  const messageId = params.id as string

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [keyholders, setKeyholders] = useState<{ id: string; name: string; email: string }[]>([])
  const [form, setForm] = useState({
    title: '', content: '',
    triggerType: 'SWITCH' as 'SWITCH' | 'DATE' | 'KEYHOLDER',
    scheduledDate: '',
    scheduledTime: '09:00', // صيغة 24 ساعة
  })
  const [recipients, setRecipients] = useState<Recipient[]>([
    { name: '', email: '', phone: '', channel: 'EMAIL' },
  ])

  useEffect(() => {
    const load = async () => {
      try {
        const [msgRes, khRes] = await Promise.all([
          fetch(`/api/messages/${messageId}`),
          fetch('/api/keyholders'),
        ])
        const msgData = await msgRes.json()
        const khData = await khRes.json()

        if (msgData.success) {
          const m = msgData.data
          let scheduledDate = ''
          let scheduledTime = '09:00'
          
          if (m.scheduledAt) {
            const date = new Date(m.scheduledAt)
            scheduledDate = date.toISOString().split('T')[0] // YYYY-MM-DD
            scheduledTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` // HH:mm
          }
          
          setForm({
            title: m.title,
            content: m.content,
            triggerType: m.triggerType,
            scheduledDate,
            scheduledTime,
          })
          setRecipients(m.recipients.map((r: any) => ({
            id: r.id, name: r.name,
            email: r.email || '', phone: r.phone || '',
            channel: r.channel, isKeyholder: false,
          })))
        }
        if (khData.success) setKeyholders(khData.data || [])
      } catch { toast.error('فشل تحميل الرسالة') }
      finally { setFetching(false) }
    }
    load()
  }, [messageId])

  const addRecipient = () => {
    if (recipients.length >= 10) return toast.error('الحد الأقصى 10 مستلمين')
    setRecipients([...recipients, { name: '', email: '', phone: '', channel: 'EMAIL' }])
  }

  const addKeyholderAsRecipient = (kh: { id: string; name: string; email: string }) => {
    if (recipients.some(r => r.email === kh.email)) {
      return toast.error('هذا الشاهد مضاف بالفعل')
    }
    setRecipients([...recipients, {
      name: kh.name, email: kh.email, phone: '',
      channel: 'EMAIL', isKeyholder: true,
    }])
    toast.success(`تمت إضافة ${kh.name} كمستلم`)
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
    if (recipients.some(r => !r.name || (r.channel === 'EMAIL' && !r.email) || (['WHATSAPP', 'SMS'].includes(r.channel) && !r.phone))) {
      return toast.error('يرجى ملء بيانات جميع المستلمين')
    }

    setLoading(true)
    try {
      // بناء التاريخ والوقت بشكل آمن
      let scheduledAt: string | null = null
      if (form.triggerType === 'DATE' && form.scheduledDate && form.scheduledTime) {
        scheduledAt = `${form.scheduledDate} ${form.scheduledTime}`
      }

      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          triggerType: form.triggerType,
          scheduledAt,
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
      toast.success('✅ تم تحديث الرسالة')
      router.push(`/dashboard/messages/${messageId}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-2xl" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/dashboard/messages/${messageId}`} className="text-[#7A6A52] hover:text-[#1A1208]">
          <ArrowRight size={20} />
        </Link>
        <div>
          <p className="section-label">تعديل الرسالة</p>
          <h1 className="page-title">تحديث الرسالة</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title & Content */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-[#1A1208] text-sm">تفاصيل الرسالة</h2>
          <div>
            <label className="block text-sm text-[#3D2F1A] mb-2">عنوان الرسالة *</label>
            <input className="input" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} maxLength={200} />
          </div>
          <div>
            <label className="block text-sm text-[#3D2F1A] mb-2">محتوى الرسالة *</label>
            <textarea className="input min-h-[180px] resize-y" value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })} maxLength={10000} />
          </div>
        </div>

        {/* Trigger */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-[#1A1208] text-sm">وقت الإرسال</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'SWITCH', label: 'مفتاح الغياب', desc: 'عند انقطاعك' },
              { value: 'DATE', label: 'تاريخ محدد', desc: 'في يوم تحدده' },
              { value: 'KEYHOLDER', label: 'الشاهد الموثوق', desc: 'عند تأكيده' },
            ].map(t => (
              <button key={t.value} type="button"
                onClick={() => setForm({ ...form, triggerType: t.value as any })}
                className={`p-3 rounded-xl border text-right transition-all ${
                  form.triggerType === t.value
                    ? 'border-[#D4A017] bg-[#FAF3E0]'
                    : 'border-[rgba(184,134,11,0.2)] hover:border-[#D4A017]'
                }`}>
                <p className="text-[#1A1208] text-sm font-medium">{t.label}</p>
                <p className="text-[#7A6A52] text-xs mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
          {form.triggerType === 'DATE' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#3D2F1A] mb-2">التاريخ *</label>
                  <input type="date" className="input" value={form.scheduledDate}
                    onChange={e => setForm({ ...form, scheduledDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="block text-sm text-[#3D2F1A] mb-2">الوقت (24 ساعة) *</label>
                  <input type="time" className="input" value={form.scheduledTime}
                    onChange={e => setForm({ ...form, scheduledTime: e.target.value })}
                    placeholder="HH:mm" />
                </div>
              </div>
              <p className="text-[#7A6A52] text-xs">سيتم إرسال الرسالة في التاريخ والوقت المحدد بتوقيت الموقع</p>
            </div>
          )}
                min={new Date().toISOString().slice(0, 16)} />
            </div>
          )}
        </div>

        {/* Keyholders as recipients */}
        {keyholders.length > 0 && (
          <div className="card space-y-3">
            <h2 className="font-semibold text-[#1A1208] text-sm">إضافة شاهد موثوق كمستلم</h2>
            <p className="text-[#7A6A52] text-xs">يمكن للشاهد الموثوق أن يكون أيضاً مستلماً للرسالة</p>
            <div className="flex flex-wrap gap-2">
              {keyholders.map(kh => (
                <button key={kh.id} type="button"
                  onClick={() => addKeyholderAsRecipient(kh)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[rgba(184,134,11,0.3)] bg-[#FAF3E0] text-sm text-[#3D2F1A] hover:border-[#D4A017] transition-all">
                  <span className="text-[#B8860B]">👤</span>
                  {kh.name}
                  <Plus size={12} className="text-[#B8860B]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recipients */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#1A1208] text-sm">المستلمون ({recipients.length}/10)</h2>
            <button type="button" onClick={addRecipient}
              className="btn-secondary text-xs py-2 px-4 flex items-center gap-1">
              <Plus size={14} /> إضافة مستلم
            </button>
          </div>
          {recipients.map((r, i) => (
            <div key={i} className="bg-[#FDF8F0] border border-[rgba(184,134,11,0.15)] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#B8860B] text-xs font-medium flex items-center gap-1">
                  {r.isKeyholder && <span>👤 شاهد موثوق · </span>}مستلم {i + 1}
                </span>
                {recipients.length > 1 && (
                  <button type="button" onClick={() => removeRecipient(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#7A6A52] mb-1">الاسم *</label>
                  <input className="input text-sm py-2" placeholder="اسم المستلم"
                    value={r.name} onChange={e => updateRecipient(i, 'name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-[#7A6A52] mb-1">قناة الإرسال</label>
                  <select className="input text-sm py-2" value={r.channel}
                    onChange={e => updateRecipient(i, 'channel', e.target.value as any)}>
                    <option value="EMAIL">البريد الإلكتروني</option>
                    <option value="WHATSAPP">واتساب</option>
                    <option value="SMS">رسالة نصية</option>
                  </select>
                </div>
              </div>
              {r.channel === 'EMAIL' && (
                <div>
                  <label className="block text-xs text-[#7A6A52] mb-1">البريد الإلكتروني *</label>
                  <input className="input text-sm py-2" type="email" placeholder="example@email.com"
                    value={r.email} onChange={e => updateRecipient(i, 'email', e.target.value)} />
                </div>
              )}
              {(r.channel === 'WHATSAPP' || r.channel === 'SMS') && (
                <div>
                  <label className="block text-xs text-[#7A6A52] mb-1">رقم الهاتف *</label>
                  <input className="input text-sm py-2" type="tel" placeholder="+966501234567"
                    value={r.phone} onChange={e => updateRecipient(i, 'phone', e.target.value)} dir="ltr" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading
              ? <div className="w-4 h-4 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
              : <Save size={15} />}
            {loading ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
          </button>
          <Link href={`/dashboard/messages/${messageId}`} className="btn-secondary px-6">إلغاء</Link>
        </div>
      </form>
    </div>
  )
}
