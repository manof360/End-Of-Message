'use client'
// src/app/dashboard/keyholders/page.tsx
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Users, Plus, Trash2, CheckCircle, Clock, Shield } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

type Keyholder = {
  id: string
  name: string
  email: string
  confirmedAt: string | null
  createdAt: string
  activationToken: string
}

export default function KeyholdersPage() {
  const [keyholders, setKeyholders] = useState<Keyholder[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '' })

  const fetchKeyholders = async () => {
    const res = await fetch('/api/keyholders')
    const d = await res.json()
    if (d.success) setKeyholders(d.data)
    setLoading(false)
  }

  useEffect(() => { fetchKeyholders() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email) return toast.error('يرجى ملء جميع الحقول')
    if (keyholders.length >= 5) return toast.error('الحد الأقصى 5 شهود موثوقون')

    setAdding(true)
    try {
      const res = await fetch('/api/keyholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('✅ تم إضافة الشاهد وإرسال إشعار له')
      setKeyholders([...keyholders, d.data])
      setForm({ name: '', email: '' })
      setShowForm(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الشاهد؟')) return
    try {
      await fetch(`/api/keyholders/${id}`, { method: 'DELETE' })
      setKeyholders(keyholders.filter(k => k.id !== id))
      toast.success('تم حذف الشاهد')
    } catch {
      toast.error('فشل الحذف')
    }
  }

  return (
    <div className="animate-fade-in w-full max-w-2xl mx-auto space-y-6 px-4 sm:px-6 md:px-0" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="section-label text-xs md:text-sm">الشهود الموثوقون</p>
          <h1 className="page-title text-2xl md:text-3xl">Keyholders</h1>
          <p className="text-[#7A6A52] text-xs md:text-sm mt-1">أشخاص يؤكّدون وفاتك لإرسال رسائلك</p>
        </div>
        {!showForm && keyholders.length < 5 && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-xs md:text-sm w-full sm:w-auto justify-center sm:justify-start px-4 py-2.5 md:py-3">
            <Plus size={14} /> إضافة شاهد
          </button>
        )}
      </div>

      {/* Explanation */}
      <div className="card bg-[#FAF3E0] border-[rgba(184,134,11,0.3)] space-y-2 p-4 md:p-6">
        <div className="flex items-start gap-2 md:items-center">
          <Shield size={14} className="text-[#B8860B] flex-shrink-0 mt-1 md:mt-0" />
          <h3 className="text-[#1A1208] font-medium text-xs md:text-sm">ما هو الشاهد الموثوق؟</h3>
        </div>
        <p className="text-[#7A6A52] text-xs md:text-sm leading-relaxed">
          شخص تثق به (طبيب، محامٍ، صديق مقرّب) يحصل على رابط سري.
          عند وفاتك، يستطيع تفعيل إرسال رسائلك <strong className="text-[#1A1208]">دون الاطلاع على محتواها</strong>.
          هذا طبقة أمان إضافية فوق Dead Man's Switch.
        </p>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="card border-[#D4A017] space-y-4 p-4 md:p-6">
          <h3 className="font-semibold text-[#1A1208] text-sm md:text-base">إضافة شاهد موثوق</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm text-[#3D2F1A] mb-2">الاسم *</label>
              <input className="input text-xs md:text-sm py-2 md:py-3 px-3 md:px-4" placeholder="اسم الشاهد" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs md:text-sm text-[#3D2F1A] mb-2">البريد الإلكتروني *</label>
              <input className="input text-xs md:text-sm py-2 md:py-3 px-3 md:px-4" type="email" placeholder="email@example.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} dir="ltr" />
            </div>
          </div>
          <p className="text-[#7A6A52] text-xs">
            سيتلقى الشاهد إشعاراً بريدياً يشرح دوره. لن يرى محتوى رسائلك.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="submit" disabled={adding} className="btn-primary flex-1 text-xs md:text-sm py-2.5 md:py-3">
              {adding ? 'جارٍ الإضافة...' : 'إضافة الشاهد'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary px-4 md:px-6 text-xs md:text-sm py-2.5 md:py-3">إلغاء</button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-8 md:py-12 text-[#7A6A52] text-sm">جارٍ التحميل...</div>
      ) : keyholders.length === 0 ? (
        <div className="card text-center py-8 md:py-12 px-4">
          <Users className="w-10 h-10 md:w-12 md:h-12 text-[#7A6A52] mx-auto mb-4 opacity-30" />
          <h3 className="text-[#1A1208] font-medium mb-2 text-base md:text-lg">لا يوجد شهود بعد</h3>
          <p className="text-[#7A6A52] text-xs md:text-sm mb-4">أضف شخصاً تثق به لتأمين إرسال رسائلك</p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2 text-xs md:text-sm py-2.5 md:py-3 px-4 md:px-6">
            <Plus size={14} /> إضافة شاهد
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {keyholders.map(kh => (
            <div key={kh.id} className="card-elevated flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 md:p-4">
              <div className="w-10 h-10 bg-[#FAF3E0] rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[#B8860B] text-sm">
                {kh.name[0]}
              </div>
              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                  <p className="text-[#1A1208] font-medium text-sm">{kh.name}</p>
                  {kh.confirmedAt ? (
                    <span className="badge badge-green flex items-center gap-1 text-xs w-fit">
                      <CheckCircle size={10} /> مؤكّد
                    </span>
                  ) : (
                    <span className="badge badge-gray flex items-center gap-1 text-xs w-fit">
                      <Clock size={10} /> بانتظار التأكيد
                    </span>
                  )}
                </div>
                <p className="text-[#7A6A52] text-xs break-all" dir="ltr">{kh.email}</p>
                <p className="text-[#7A6A52] text-xs mt-0.5">
                  أُضيف {formatDistanceToNow(new Date(kh.createdAt), { locale: ar, addSuffix: true })}
                </p>
              </div>
              <button onClick={() => handleDelete(kh.id)}
                className="text-red-300 hover:text-red-500 transition-colors p-2 flex-shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {keyholders.length > 0 && (
        <p className="text-[#7A6A52] text-xs text-center">
          {keyholders.length}/5 شهود موثوقون
        </p>
      )}
    </div>
  )
}
