'use client'
// src/app/dashboard/messages/[id]/DeleteMessageButton.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'

export default function DeleteMessageButton({ messageId }: { messageId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const handleDelete = async () => {
    if (!confirm) { setConfirm(true); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('فشل الحذف')
      toast.success('تم حذف الرسالة')
      router.push('/dashboard/messages')
      router.refresh()
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
      setLoading(false)
      setConfirm(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
        confirm
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'border border-red-200 text-red-500 hover:bg-red-50'
      }`}
    >
      <Trash2 size={14} />
      {loading ? 'جارٍ الحذف...' : confirm ? 'تأكيد الحذف!' : 'حذف'}
    </button>
  )
}
