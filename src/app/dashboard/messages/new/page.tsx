'use client'
// src/app/dashboard/messages/new/page.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Trash2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

type Recipient = { name: string; email: string; phone: string; channel: 'EMAIL' | 'WHATSAPP' | 'SMS'; isKeyholder?: boolean }

export default function NewMessagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [keyholders, setKeyholders] = useState<{ id: string; name: string; email: string }[]>([])
  const [form, setForm] = useState({
    title: '',
    content: '',
    triggerType: 'SWITCH' as 'SWITCH' | 'DATE' | 'KEYHOLDER',
    scheduledAt: '',
  })
  const [recipients, setRecipients] = useState<Recipient[]>([
    { name: '', email: '', phone: '', channel: 'EMAIL' },
  ])

  useEffect(() => {
    fetch('/api/keyholders').then(r => r.json()).then(d => {
      if (d.success) setKeyholders(d.data || [])
    }).catch(() => {})
  }, [])

  const addKeyholderAsRecipient = (kh: { id: string; name: string; email: string }) => {
    if (recipients.some(r => r.email === kh.email)) return toast.error('هذا الشاهد مضاف بالفعل')
    setRecipients([...recipients, { name: kh.name, email: kh.email, phone: '', channel: 'EMAIL', isKeyholder: true }])
    toast.success(`تمت إضافة ${kh.name}`)
  }

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

    setLoading(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          scheduledAt: form.triggerType === 'DATE' ? new Date(form.scheduledAt).toISOString() : null,
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
      toast.success('✅ تم حفظ رسالتك')
      router.push('/dashboard/messages')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in w-full max-w-2xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <Link href="/dashboard/messages" className="text-[#7A6A52] hover:text-[#1A1208] flex-shrink-0">
          <ArrowRight size={20} />
        </Link>
        <div className="min-w-0">
          <p className="section-label text-xs">رسالة جديدة</p>
          <h1 className="page-title text-lg md:text-2xl">اكتب رسالتك</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="card space-y-3 md:space-y-4">
          <h2 className="font-semibold text-[#1A1208] text-sm">تفاصيل الرسالة</h2>
          <div>
            <label className="block text-xs md:text-sm text-[#3D2F1A] mb-2">عنوان الرسالة *</label>
            <input className="input text-sm" placeholder="مثال: رسالتي لزوجتي العزيزة"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={200} />
          </div>
          <div>
            <label className="block text-xs md:text-sm text-[#3D2F1A] mb-2">محتوى الرسالة *</label>
            <textarea className="input min-h-[150px] md:min-h-[200px] resize-y text-sm" placeholder="اكتب رسالتك هنا..."
              value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} maxLength={10000} />
            <p className="text-[#7A6A52] text-xs mt-1 text-left">{form.content.length}/10000</p>
          </div>
        </div>

        <div className="card space-y-3 md:space-y-4">
          <h2 className="font-semibold text-[#1A1208] text-sm">متى تُرسَل هذه الرسالة؟</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
            {[
              { value: 'SWITCH', label: 'مفتاح الغياب', desc: 'عند انقطاعك' },
              { value: 'DATE', label: 'تاريخ محدد', desc: 'في يوم تحدده' },
              { value: 'KEYHOLDER', label: 'الشاهد الموثوق', desc: 'عند تأكيده' },
            ].map(t => (
              <button key={t.value} type="button"
                onClick={() => setForm({ ...form, triggerType: t.value as any })}
                className={`p-3 rounded-lg md:rounded-xl border text-right transition-all text-xs md:text-sm ${
                  form.triggerType === t.value ? 'border-[#D4A017] bg-[#FAF3E0]' : 'border-[rgba(184,134,11,0.2)] hover:border-[#D4A017]'
                }`}>
                <p className="text-[#1A1208] font-medium">{t.label}</p>
                <p className="text-[#7A6A52] text-xs mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
          {form.triggerType === 'DATE' && (
            <div>
              <label className="block text-xs md:text-sm text-[#3D2F1A] mb-2">التاريخ والوقت *</label>
              <input type="datetime-local" className="input text-sm" value={form.scheduledAt}
                onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
                min={new Date().toISOString().slice(0, 16)} />
            </div>
          )}
        </div>

        {/* Add keyholder as recipient */}
        {keyholders.length > 0 && (
          <div className="card space-y-2 md:space-y-3">
            <h2 className="font-semibold text-[#1A1208] text-sm">إضافة شاهد موثوق كمستلم</h2>
            <p className="text-[#7A6A52] text-xs">يمكن للشاهد الموثوق أيضاً استقبال الرسالة</p>
            <div className="flex flex-wrap gap-2">
              {keyholders.map(kh => (
                <button key={kh.id} type="button" onClick={() => addKeyholderAsRecipient(kh)}
                  className="flex items-center gap-2 px-2 md:px-3 py-1 md:py-2 rounded-lg border border-[rgba(184,134,11,0.3)] bg-[#FAF3E0] text-xs md:text-sm text-[#3D2F1A] hover:border-[#D4A017] transition-all">
                  <span className="text-[#B8860B]">👤</span>
                  <span className="truncate">{kh.name}</span> <Plus size={12} className="text-[#B8860B] flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="card space-y-3 md:space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="font-semibold text-[#1A1208] text-sm">المستلمون ({recipients.length}/10)</h2>
            <button type="button" onClick={addRecipient}
              className="btn-secondary text-xs py-2 px-3 md:px-4 flex items-center gap-1 w-full sm:w-auto">
              <Plus size={14} /> إضافة مستلم
            </button>
          </div>
          {recipients.map((r, i) => (
            <div key={i} className="bg-[#FDF8F0] border border-[rgba(184,134,11,0.15)] rounded-lg md:rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#B8860B] text-xs font-medium flex items-center gap-1 min-w-0">
                  {r.isKeyholder && '👤'} 
                  <span className="truncate">
                    {r.isKeyholder ? 'شاهد موثوق · ' : ''}مستلم {i + 1}
                  </span>
                </span>
                {recipients.length > 1 && (
                  <button type="button" onClick={() => removeRecipient(i)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div>
                  <label className="block text-xs text-[#7A6A52] mb-1">الاسم *</label>
                  <input className="input text-xs md:text-sm py-2" placeholder="اسم المستلم"
                    value={r.name} onChange={e => updateRecipient(i, 'name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-[#7A6A52] mb-1">القناة</label>
                  <select className="input text-xs md:text-sm py-2" value={r.channel}
                    onChange={e => updateRecipient(i, 'channel', e.target.value as any)}>
                    <option value="EMAIL">البريد</option>
                    <option value="WHATSAPP">واتس</option>
                    <option value="SMS">رسالة</option>
                  </select>
                </div>
              </div>
              {r.channel === 'EMAIL' && (
                <div>
                  <label className="block text-xs text-[#7A6A52] mb-1">البريد الإلكتروني *</label>
                  <input className="input text-xs md:text-sm py-2" type="email" placeholder="example@email.com"
                    value={r.email} onChange={e => updateRecipient(i, 'email', e.target.value)} />
                </div>
              )}
              {(r.channel === 'WHATSAPP' || r.channel === 'SMS') && (
                <div>
                  <label className="block text-xs text-[#7A6A52] mb-1">رقم الهاتف *</label>
                  <input className="input text-xs md:text-sm py-2" type="tel" placeholder="+966501234567"
                    value={r.phone} onChange={e => updateRecipient(i, 'phone', e.target.value)} dir="ltr" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg md:rounded-xl p-3 md:p-4 text-xs md:text-sm">
          <span className="text-blue-600 text-base md:text-lg flex-shrink-0">💾</span>
          <p className="text-blue-800">ستُحفظ رسالتك في <strong>Google Drive</strong> كنسخة احتياطية آمنة.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <button type="submit" disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2 md:py-3">
            {loading && <div className="w-4 h-4 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />}
            {loading ? 'جارٍ الحفظ...' : 'حفظ الرسالة ✓'}
          </button>
          <Link href="/dashboard/messages" className="btn-secondary px-4 md:px-6 py-2 md:py-3 text-sm">إلغاء</Link>
        </div>
      </form>
    </div>
  )
}
