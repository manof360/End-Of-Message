import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Lock, Shield, Eye, Database, AlertTriangle, CheckCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'الأمان والخصوصية — Wasiyati',
  description: 'تعرف على معايير الأمان والتشفير في Wasiyati.',
  openGraph: {
    title: 'الأمان والخصوصية — Wasiyati',
    url: 'https://wasiyati.app/security',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F0] to-[#FAF5ED]">
      {/* Header */}
      <div className="border-b border-amber-200 bg-[#FDF8F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            العودة للرئيسية
          </Link>
          <h1 className="text-4xl font-bold text-amber-900">الأمان والخصوصية</h1>
          <p className="text-amber-700 mt-2">كيف نحمي بيانات</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          {/* Encryption */}
          <section className="border-b border-amber-200 pb-12">
            <h2 className="text-3xl font-bold text-amber-900 mb-6 flex items-center gap-3">
              <Lock className="w-8 h-8 text-red-600" />
              التشفير
            </h2>
            <div className="space-y-4 text-amber-700">
              <div className="bg-white border border-amber-200 rounded-lg p-6">
                <h3 className="font-bold text-amber-900 mb-2">AES-256 Encryption</h3>
                <p>
                  جميع الرسائل مشفرة بـ AES-256، معيار التشفير العسكري. هذا يعني أن رسالتك محمية
                  من أي هجوم محتمل.
                </p>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-6">
                <h3 className="font-bold text-amber-900 mb-2">End-to-End Encryption</h3>
                <p>
                  الرسائل مشفرة قبل مغادرة جهازك. حتى خوادمنا لا تملك مفاتيح فك التشفير. المستقبل
                  فقط يستطيع فتح الرسالة.
                </p>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-6">
                <h3 className="font-bold text-amber-900 mb-2">HTTPS/TLS</h3>
                <p>
                  جميع الاتصالات بين جهازك والخوادم مشفرة بـ HTTPS. لا أحد يستطيع اعتراض بيانات
                  الاتصال.
                </p>
              </div>
            </div>
          </section>

          {/* Authentication */}
          <section className="border-b border-amber-200 pb-12">
            <h2 className="text-3xl font-bold text-amber-900 mb-6 flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-600" />
              المصادقة والهوية
            </h2>
            <div className="space-y-4 text-amber-700">
              <div className="bg-white border border-amber-200 rounded-lg p-6">
                <h3 className="font-bold text-amber-900 mb-2">Google OAuth</h3>
                <p>
                  لا نخزن كلمات المرور. نستخدم Google OAuth بدلاً من ذلك. كلماتك محمية من قِبل
                  Google.
                </p>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-6">
                <h3 className="font-bold text-amber-900 mb-2">الجلسات الآمنة</h3>
                <p>
                  الجلسات محمية بـ JWT tokens. انتهاء الصلاحية تلقائي. لا جلسات معلقة.
                </p>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-6">
                <h3 className="font-bold text-amber-900 mb-2">2FA (قريباً)</h3>
                <p>
                  المصادقة الثنائية قريبة. حماية إضافية لحسابك.
                </p>
              </div>
            </div>
          </section>

          {/* Data Protection */}
          <section className="border-b border-amber-200 pb-12">
            <h2 className="text-3xl font-bold text-amber-900 mb-6 flex items-center gap-3">
              <Database className="w-8 h-8 text-red-600" />
              حماية البيانات
            </h2>
            <div className="space-y-4 text-amber-700">
              <div className="bg-white border border-amber-200 rounded-lg p-6">
                <h3 className="font-bold text-amber-900 mb-2">قاعدة بيانات محمية</h3>
                <p>
                  PostgreSQL مع نسخ احتياطية يومية محمية. في حالة فقدان البيانات، نستطيع استرجاعها.
                </p>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-6">
                <h3 className="font-bold text-amber-900 mb-2">عزلة البيانات</h3>
                <p>
                  بيانات المستخدم معزولة. لا يستطيع مستخدم واحد رؤية بيانات مستخدم آخر.
                </p>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-6">
                <h3 className="font-bold text-amber-900 mb-2">الصيانة الآمنة</h3>
                <p>
                  أي صيانة تتم بسرية. نستخدم بيئات معزولة. لا تأثير على بيانات الإنتاج.
                </p>
              </div>
            </div>
          </section>

          {/* Protection Measures */}
          <section className="border-b border-amber-200 pb-12">
            <h2 className="text-3xl font-bold text-amber-900 mb-6 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              الحماية من الهجمات
            </h2>
            <div className="space-y-4">
              {[
                { title: 'XSS Protection', desc: 'حماية من Cross-Site Scripting' },
                { title: 'CSRF Protection', desc: 'حماية من Cross-Site Request Forgery' },
                { title: 'SQL Injection', desc: 'لا يمكن حقن أوامر SQL' },
                { title: 'Rate Limiting', desc: 'تحديد محاولات الدخول المتكررة' },
                { title: 'Input Validation', desc: 'التحقق من صحة جميع المدخلات' },
                { title: 'CORS Security', desc: 'تحديد الطلبات من النطاقات المسموحة' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900">{item.title}</h4>
                    <p className="text-amber-700 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Privacy */}
          <section className="border-b border-amber-200 pb-12">
            <h2 className="text-3xl font-bold text-amber-900 mb-6 flex items-center gap-3">
              <Eye className="w-8 h-8 text-red-600" />
              الخصوصية
            </h2>
            <div className="space-y-4 text-amber-700">
              <div className="bg-white border border-amber-200 rounded-lg p-6">
                <h3 className="font-bold text-amber-900 mb-2">لا إعلانات</h3>
                <p>
                  لا نتتبع مستخدمينا للإعلانات. لا نبيع البيانات.
                </p>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-6">
                <h3 className="font-bold text-amber-900 mb-2">لا تتبع</h3>
                <p>
                  لا نستخدم Facebook Pixel أو Google Analytics. الخصوصية أولاً.
                </p>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-6">
                <h3 className="font-bold text-amber-900 mb-2">GDPR Compliance</h3>
                <p>
                  نمتثل بـ GDPR وقوانين الخصوصية الدولية. حقوقك محمية.
                </p>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-6">
                <h3 className="font-bold text-amber-900 mb-2">حذف البيانات</h3>
                <p>
                  يمكنك حذف حسابك وجميع بيانات في أي وقت. بنقرة واحدة.
                </p>
              </div>
            </div>
          </section>

          {/* Security Standards */}
          <section>
            <h2 className="text-3xl font-bold text-amber-900 mb-6">معايير الأمان</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                'ISO 27001 Compliant',
                'OWASP Top 10 Protection',
                'Regular Security Audits',
                'Bug Bounty Program',
                'Zero-Trust Architecture',
                'Defense in Depth',
              ].map((standard, idx) => (
                <div key={idx} className="bg-white border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <span className="text-amber-900 font-medium">{standard}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Reporting */}
          <section className="bg-amber-50 border-2 border-red-600 rounded-lg p-8 space-y-4 mt-12">
            <h2 className="text-2xl font-bold text-amber-900">اكتشفت ثغرة أمنية؟</h2>
            <p className="text-amber-700">
              إذا اكتشفت ثغرة أمنية، أرسل تقرير مفصل إلى:
            </p>
            <div className="bg-white p-4 rounded border border-amber-200">
              <a
                href="mailto:security@wasiyati.app"
                className="text-red-600 font-bold hover:text-red-700 flex items-center gap-2"
              >
                <Shield className="w-5 h-5" />
                security@wasiyati.app
              </a>
            </div>
            <p className="text-amber-700 text-sm">
              سنرد على التقرير في أسرع وقت ممكن. نحن نقدر التقارير المسؤولة.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
