import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Mail, MessageSquare } from 'lucide-react'

export const metadata: Metadata = {
  title: 'اتصل بنا — Wasiyati',
  description: 'احصل على الدعم والمساعدة من فريق Wasiyati. نحن هنا لمساعدتك.',
  openGraph: {
    title: 'اتصل بنا — Wasiyati',
    url: 'https://wasiyati.app/contact',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F0] to-[#FAF5ED]">
      {/* Header */}
      <div className="border-b border-amber-200 bg-[#FDF8F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            العودة للرئيسية
          </Link>
          <h1 className="text-4xl font-bold text-amber-900">اتصل بنا</h1>
          <p className="text-amber-700 mt-2">نحن هنا للمساعدة</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Support Channels */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-amber-900">قنوات الدعم</h2>

            <div className="border-l-4 border-red-600 pl-6 py-4 hover:bg-white rounded-r transition">
              <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-red-600" />
                البريد الإلكتروني
              </h3>
              <p className="text-amber-700 text-sm mb-3">
                أرسل لنا رسالة حول أي موضوع:
              </p>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-semibold text-amber-900">الدعم العام:</p>
                  <a
                    href="mailto:support@wasiyati.app"
                    className="text-red-600 hover:text-red-700 underline"
                  >
                    support@wasiyati.app
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-amber-900">الخصوصية والأمان:</p>
                  <a
                    href="mailto:security@wasiyati.app"
                    className="text-red-600 hover:text-red-700 underline"
                  >
                    security@wasiyati.app
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-amber-900">القضايا القانونية:</p>
                  <a
                    href="mailto:legal@wasiyati.app"
                    className="text-red-600 hover:text-red-700 underline"
                  >
                    legal@wasiyati.app
                  </a>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-red-600 pl-6 py-4 hover:bg-white rounded-r transition">
              <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-red-600" />
                الدعم داخل التطبيق
              </h3>
              <p className="text-amber-700 text-sm">
                قم بتسجيل الدخول إلى حسابك واذهب إلى الإعدادات للتواصل معنا مباشرة.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-bold text-amber-900 mb-6">أرسل لنا رسالة</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  الاسم
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="اسمك"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="بريدك@مثال.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  الموضوع
                </label>
                <select className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600">
                  <option>اختر الموضوع...</option>
                  <option>سؤال عام</option>
                  <option>مشكلة فنية</option>
                  <option>اقتراح</option>
                  <option>تقرير خطأ</option>
                  <option>آخر</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  الرسالة
                </label>
                <textarea
                  rows={5}
                  className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 resize-none"
                  placeholder="أخبرنا عن موضوعك..."
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
              >
                إرسال الرسالة
              </button>
            </form>
            <p className="text-xs text-amber-600 mt-4 text-center">
              سنرد على رسالتك في غضون 24 ساعة.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 bg-white border border-amber-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-amber-900 mb-6">أسئلة شائعة</h2>
          <div className="space-y-6">
            <details className="group cursor-pointer">
              <summary className="flex justify-between items-center font-bold text-amber-900 select-none hover:text-red-600">
                كم الوقت اللازم للرد على الرسالة؟
                <span className="text-red-600 group-open:hidden">+</span>
                <span className="group-open:inline hidden">−</span>
              </summary>
              <p className="text-amber-700 mt-3">
                نحاول الرد على جميع الرسائل في غضون 24 ساعة. قد يستغرق الأمر أطول إذا كانت
                الرسالة معقدة.
              </p>
            </details>
            <details className="group cursor-pointer">
              <summary className="flex justify-between items-center font-bold text-amber-900 select-none hover:text-red-600">
                هل يمكنني الحصول على الدعم الفني؟
                <span className="text-red-600 group-open:hidden">+</span>
                <span className="group-open:inline hidden">−</span>
              </summary>
              <p className="text-amber-700 mt-3">
                نعم! أرسل رسالة إلى support@wasiyati.app واشرح المشكلة. سنساعدك بأسرع وقت ممكن.
              </p>
            </details>
            <details className="group cursor-pointer">
              <summary className="flex justify-between items-center font-bold text-amber-900 select-none hover:text-red-600">
                هل تقبلون الاقتراحات؟
                <span className="text-red-600 group-open:hidden">+</span>
                <span className="group-open:inline hidden">−</span>
              </summary>
              <p className="text-amber-700 mt-3">
                بالتأكيد! نحب الاستماع إلى أفكار المستخدمين. أرسل اقتراحك وسننظر فيه بجدية.
              </p>
            </details>
            <details className="group cursor-pointer">
              <summary className="flex justify-between items-center font-bold text-amber-900 select-none hover:text-red-600">
                هل يمكنني الإبلاغ عن خطأ أمني؟
                <span className="text-red-600 group-open:hidden">+</span>
                <span className="group-open:inline hidden">−</span>
              </summary>
              <p className="text-amber-700 mt-3">
                نعم! أرسل تقرير الخطأ الأمني إلى security@wasiyati.app. ستعامل بسرية. لا تنشر التفاصيل علناً.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}
