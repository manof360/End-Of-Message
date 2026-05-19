import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Zap, Shield, Lock, Cloud, BarChart3 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'المميزات — Wasiyati',
  description: 'تعرف على مميزات Wasiyati القوية والموثوقة والآمنة.',
  openGraph: {
    title: 'المميزات — Wasiyati',
    url: 'https://wasiyati.app/features',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function FeaturesPage() {
  const features = [
    {
      icon: Lock,
      title: 'التشفير الكامل',
      description:
        'جميع الرسائل مشفرة بـ AES-256. التشفير طرفي يعني أن حتى Wasiyati لا تستطيع قراءة رسائلك.',
      points: ['AES-256 Encryption', 'End-to-End', 'لا قراءة من الموظفين', 'محمية 100%'],
    },
    {
      icon: Zap,
      title: 'الإرسال الذكي',
      description:
        'حدد عدد الأيام بدون تسجيل دخول. إذا توقفتَ عن الدخول، تُرسَل الرسائل تلقائياً.',
      points: ['مراقبة تلقائية', 'إعادة محاولة ذكية', 'تتبع دقيق', 'إرسال معاد'],
    },
    {
      icon: Cloud,
      title: 'تخزين آمن',
      description:
        'رسائلك محفوظة في خوادم محمية بأحدث التقنيات. نسخ احتياطية تلقائية يومية.',
      points: ['نسخ احتياطية يومية', 'خوادم موثوقة', 'قاعدة بيانات قوية', 'استرجاع سريع'],
    },
    {
      icon: Shield,
      title: 'الأمان المتعدد',
      description:
        'حماية ضد XSS و CSRF و SQL Injection و Spam. معايير أمان عالية جداً.',
      points: ['حماية HTTPS', 'فحص ثغرات', 'منع الهجمات', 'معايير عالية'],
    },
    {
      icon: BarChart3,
      title: 'التتبع والإحصائيات',
      description: 'تابع حالة الرسائل. اعرف متى تُرسَل وإن تم استقبالها بنجاح.',
      points: ['تتبع الحالة', 'إحصائيات دقيقة', 'سجل مفصل', 'تنبيهات'],
    },
    {
      icon: Zap,
      title: 'سهولة الاستخدام',
      description: 'واجهة بسيطة وواضحة. لا تحتاج خبرة تقنية. أي شخص يستطيع الاستخدام.',
      points: ['واجهة بديهية', 'تعليمات واضحة', 'دعم سريع', 'سهل جداً'],
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F0] to-[#FAF5ED]">
      {/* Header */}
      <div className="border-b border-amber-200 bg-[#FDF8F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            العودة للرئيسية
          </Link>
          <h1 className="text-4xl font-bold text-amber-900">المميزات</h1>
          <p className="text-amber-700 mt-2">كل ما يجعل Wasiyati قوية وموثوقة</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div
                key={idx}
                className="border border-amber-200 rounded-lg p-6 hover:shadow-lg transition hover:border-red-600"
              >
                <Icon className="w-12 h-12 text-red-600 mb-4" />
                <h3 className="text-xl font-bold text-amber-900 mb-3">{feature.title}</h3>
                <p className="text-amber-700 text-sm mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.points.map((point, pIdx) => (
                    <li key={pIdx} className="flex items-center gap-2 text-amber-700 text-sm">
                      <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Comparison Table */}
        <section className="bg-white rounded-lg border border-amber-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-amber-900 mb-8 text-center">المقارنة</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead>
                <tr className="border-b-2 border-amber-200">
                  <th className="text-left text-amber-900 font-bold p-4">المميزة</th>
                  <th className="text-amber-900 font-bold p-4">Wasiyati</th>
                  <th className="text-amber-700 p-4 text-sm">الخدمات الأخرى</th>
                </tr>
              </thead>
              <tbody className="space-y-4">
                {[
                  ['التشفير الطرفي', '✓', '✗'],
                  ['الخصوصية الكاملة', '✓', '✗'],
                  ['مجاني تماماً', '✓', '✗ (مدفوع)'],
                  ['لا إعلانات', '✓', '✗'],
                  ['سهل الاستخدام', '✓', '◐'],
                  ['دعم عربي', '✓', '✗'],
                  ['نسخ احتياطية', '✓', '◐'],
                  ['إرسال ذكي', '✓', '✗'],
                ].map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-amber-200 hover:bg-amber-50"
                  >
                    <td className="text-left text-amber-900 font-medium p-4">{row[0]}</td>
                    <td className="text-red-600 font-bold p-4">{row[1]}</td>
                    <td className="text-amber-600 p-4">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Coming Soon */}
        <section className="bg-amber-50 border border-amber-200 rounded-lg p-8 space-y-6">
          <h2 className="text-2xl font-bold text-amber-900">قريباً</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-bold text-amber-900">تطبيق الهاتف</h3>
              <p className="text-amber-700">تطبيق أصلي لـ iOS و Android قريباً جداً.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-amber-900">مكافآت الإحالة</h3>
              <p className="text-amber-700">أحضر أصدقاءك واحصل على مميزات إضافية.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-amber-900">الرسائل الصوتية</h3>
              <p className="text-amber-700">سجل رسائلك بصوتك. أكثر شخصية وعاطفة.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-amber-900">الفيديو</h3>
              <p className="text-amber-700">أرسل رسائل فيديو مشفرة بأمان.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-amber-900">Google Drive Backup</h3>
              <p className="text-amber-700">احفظ رسائلك في Google Drive تلقائياً.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-amber-900">الخطط المدفوعة</h3>
              <p className="text-amber-700">مميزات متقدمة للمستخدمين المتقدمين.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
