'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function TestMessagesPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [selectedMessage, setSelectedMessage] = useState<string>('')
  const [selectedChannel, setSelectedChannel] = useState<string>('')
  const [testResults, setTestResults] = useState<any>(null)

  // Fetch available messages
  const fetchMessages = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/test/send-message?isActive=true')
      const data = await response.json()

      if (data.success) {
        setMessages(data.messages)
        toast.success(`تم تحميل ${data.count} رسائل`)
      } else {
        toast.error('فشل تحميل الرسائل')
      }
    } catch (error) {
      toast.error('خطأ في الاتصال')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Send test message
  const handleSendTest = async () => {
    if (!selectedMessage) {
      toast.error('اختر رسالة للاختبار')
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/test/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: selectedMessage,
          channelFilter: selectedChannel || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTestResults(data)
        const msg = selectedChannel
          ? `تم إرسال الرسالة عبر ${selectedChannel}`
          : `تم إرسال الرسالة بنجاح إلى ${data.details[0]?.recipientCount} المستقبل`

        toast.success(msg)
      } else {
        toast.error(data.error || 'فشل الإرسال')
      }
    } catch (error) {
      toast.error('خطأ في الإرسال')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div dir="rtl" className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-amber-900 mb-8">🧪 اختبار نظام الرسائل</h1>

      {/* Section 1: Load Messages */}
      <div className="bg-stone-800 border border-amber-200/20 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-amber-200 mb-4">1️⃣ تحميل الرسائل النشطة</h2>
        <button
          onClick={fetchMessages}
          disabled={isLoading}
          className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50"
        >
          {isLoading ? 'جاري التحميل...' : 'تحميل الرسائل'}
        </button>
      </div>

      {/* Section 2: Select Message */}
      {messages.length > 0 && (
        <div className="bg-stone-800 border border-amber-200/20 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-amber-200 mb-4">2️⃣ اختر رسالة للاختبار</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-amber-100 mb-2">الرسالة</label>
              <select
                value={selectedMessage}
                onChange={e => setSelectedMessage(e.target.value)}
                className="w-full bg-stone-700 border border-amber-300/30 rounded px-4 py-2 text-amber-100"
              >
                <option value="">-- اختر رسالة --</option>
                {messages.map(msg => (
                  <option key={msg.id} value={msg.id}>
                    {msg.title} (نوع: {msg.triggerType}, المستقبلون: {msg.recipientCount})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-amber-100 mb-2">القناة (اختياري)</label>
              <select
                value={selectedChannel}
                onChange={e => setSelectedChannel(e.target.value)}
                className="w-full bg-stone-700 border border-amber-300/30 rounded px-4 py-2 text-amber-100"
              >
                <option value="">-- جميع القوانات --</option>
                <option value="EMAIL">البريد الإلكتروني</option>
                <option value="SMS">الرسائل النصية</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Send Test */}
      {messages.length > 0 && (
        <div className="bg-stone-800 border border-amber-200/20 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-amber-200 mb-4">3️⃣ أرسل الرسالة</h2>
          <button
            onClick={handleSendTest}
            disabled={isLoading || !selectedMessage}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'جاري الإرسال...' : '📤 أرسل الآن'}
          </button>
        </div>
      )}

      {/* Results */}
      {testResults && (
        <div className="bg-stone-800 border border-amber-200/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-amber-200 mb-4">📊 نتائج الاختبار</h2>

          <div className="mb-6 p-4 bg-stone-700/50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {testResults.summary.succeeded}
                </div>
                <div className="text-sm text-amber-100">رسائل نجحت</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-200">
                  {testResults.summary.total}
                </div>
                <div className="text-sm text-amber-100">إجمالي الرسائل</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">
                  {testResults.summary.failed}
                </div>
                <div className="text-sm text-amber-100">رسائل فشلت</div>
              </div>
            </div>
            <div className="text-sm text-amber-100">وقت الاختبار: {testResults.summary.tested_at}</div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            {testResults.details.map((detail: any, idx: number) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  detail.success
                    ? 'bg-green-900/20 border-green-600/30'
                    : 'bg-red-900/20 border-red-600/30'
                }`}
              >
                <div className="mb-2">
                  <div className="font-semibold text-amber-100">{detail.title}</div>
                  <div className="text-sm text-amber-100/70">
                    {detail.triggerType} • {detail.recipientCount} مستقبل
                  </div>
                </div>

                {detail.success && detail.deliveryStatus && (
                  <div className="grid grid-cols-3 gap-2">
                    {detail.deliveryStatus.map((ds: any, i: number) => (
                      <div
                        key={i}
                        className="bg-stone-800/50 rounded p-2 text-center text-sm"
                      >
                        <div className="font-semibold text-amber-200">{ds.channel}</div>
                        <div className="text-green-400">
                          {ds.count} {ds.status === 'SENT' ? '✅' : ds.status === 'FAILED' ? '❌' : '⏳'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!detail.success && (
                  <div className="text-red-300 text-sm">❌ {detail.error || detail.reason}</div>
                )}
              </div>
            ))}
          </div>

          {/* CSV Export Button */}
          <button
            onClick={() => {
              const csv = generateCSV(testResults.details)
              downloadCSV(csv, `test-results-${Date.now()}.csv`)
            }}
            className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            📥 تصدير النتائج
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-900/30 border border-blue-400/30 rounded-lg p-4 text-sm text-blue-100">
        <p className="font-semibold mb-2">ℹ️ معلومات حول الاختبار:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>البريد الإلكتروني (EMAIL):</strong> يتم الإرسال فورا عبر Resend
          </li>
          <li>
            <strong>الرسائل النصية (SMS):</strong> معدة للتكامل (Twilio/AWS SNS)
          </li>
          <li>
            <strong>WhatsApp:</strong> معدة للتكامل (Twilio WhatsApp API)
          </li>
          <li>جميع الرسائل المرسلة تُحفظ في Google Drive تلقائيا</li>
        </ul>
      </div>
    </div>
  )
}

// Helper functions
function generateCSV(details: any[]): string {
  const headers = ['الرسالة', 'النوع', 'المستقبلون', 'البريد الإلكتروني', 'الحالة']
  const rows = details.map(d => [
    d.title,
    d.triggerType,
    d.recipientCount,
    d.channels.join(','),
    d.success ? 'نجح' : 'فشل',
  ])

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
}

function downloadCSV(csv: string, filename: string) {
  const element = document.createElement('a')
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv))
  element.setAttribute('download', filename)
  element.style.display = 'none'
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}
