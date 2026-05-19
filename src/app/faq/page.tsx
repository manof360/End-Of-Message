import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, CheckCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'الأسئلة الشائعة — Wasiyati',
  description: 'إجابات على أسئلتك الشائعة عن Wasiyati والمنصة.',
  openGraph: {
    title: 'الأسئلة الشائعة — Wasiyati',
    url: 'https://wasiyati.app/faq',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function FAQPage() {
  const faqItems = [
    {
      category: 'الحساب والتسجيل',
      items: [
        {
          q: 'كيف أنشئ حساباً؟',
          a: 'استخدم بريدك الإلكتروني أو حسابك على Google. الإنشاء مجاني وسريع.',
        },
        {
          q: 'هل هناك رسوم للخدمة؟',
          a: 'الخدمة مجانية تماماً! نحن نقدم النسخة الأساسية بدون أي تكاليف.',
        },
        {
          q: 'هل يمكنني استخدام اسم مستعار؟',
          a: 'لا، عليك استخدام بريدك الحقيقي. يجب أن يكون البريد قابلاً للتحقق.',
        },
      ],
    },
    {
      category: 'الرسائل والإرسال',
      items: [
        {
          q: 'ما أقصى عدد أحرف في الرسالة؟',
          a: 'لا يوجد حد! يمكنك كتابة رسائل طويلة كما تريد.',
        },
        {
          q: 'هل يمكنني تعديل الرسالة بعد الإرسال؟',
          a: 'لا، بعد الإرسال لا يمكن التعديل. لكن يمكنك تعديلها قبل الإرسال.',
        },
        {
          q: 'كيف أحدد موعد الإرسال؟',
          a: 'حدد عدد الأيام بدون تسجيل دخول. بعدها ستُرسَل الرسالة تلقائياً.',
        },
        {
          q: 'هل يمكنني إرسال رسالة فوراً؟',
          a: 'نعم، اختر 0 يوم وستُرسَل فوراً (بعد الأمان والتحقق).',
        },
      ],
    },
    {
      category: 'الأمان والخصوصية',
      items: [
        {
          q: 'هل رسائلي محمية؟',
          a: 'نعم تماماً. استخدمنا AES-256، أعلى معايير التشفير.',
        },
        {
          q: 'هل يمكن لموظفيكم قراءة رسائلي؟',
          a: 'لا. الرسائل مشفرة طرفياً. حتى موظفونا لا نستطيع قراءتها.',
        },
        {
          q: 'ماذا تحتفظون من بيانات؟',
          a: 'فقط البريد والرسائل. لا نجمع معلومات إضافية. اقرأ سياسة الخصوصية.',
        },
        {
          q: 'هل تشاركون البيانات مع أطراف ثالثة؟',
          a: 'لا، أبداً. بيانات المستخدم سرية تماماً.',
        },
      ],
    },
    {
      category: 'المستقبلون والإشعارات',
      items: [
        {
          q: 'هل يعرف المستقبل أنني أرسلت له رسالة؟',
          a: 'نعم، يتلقى البريد مع إخطار بأن الرسالة من Wasiyati.',
        },
        {
          q: 'هل يمكن إضافة مستقبلين متعددين؟',
          a: 'نعم، أضف عدة مستقبلين. كل واحد يتلقى رسالته الخاصة.',
        },
        {
          q: 'ماذا إذا غيّر المستقبل بريده؟',
          a: 'حدّث البريد قبل الإرسال. بعد الإرسال لا يمكن التعديل.',
        },
        {
          q: 'هل يمكن للمستقبل الرد؟',
          a: 'الرسالة بريد عادي. يمكنه الرد مباشرة عليك.',
        },
      ],
    },
    {
      category: 'الحذف والإلغاء',
      items: [
        {
          q: 'كيف أحذف رسالة؟',
          a: 'انقر على الرسالة واختر "حذف". يعمل قبل الإرسال فقط.',
        },
        {
          q: 'هل يمكن استرجاع رسالة مرسلة؟',
          a: 'لا، بعد الإرسال لا يمكن استرجاع الرسالة.',
        },
        {
          q: 'كيف أحذف حسابي؟',
          a: 'اذهب إلى الإعدادات واختر "حذف الحساب". سيُحذف كل شيء.',
        },
        {
          q: 'ماذا يحدث لرسائلي بعد حذف الحساب؟',
          a: 'الرسائل غير المرسلة تُحذف. الرسائل المرسلة تُبقى (في البريد).',
        },
      ],
    },
    {
      category: 'المشاكل الفنية',
      items: [
        {
          q: 'ما الأجهزة المدعومة؟',
          a: 'الموقع يعمل على أي متصفح حديث. يدعم الهاتف والكمبيوتر والتابلت.',
        },
        {
          q: 'هل يوجد تطبيق للهاتف؟',
          a: 'حالياً لا يوجد. يمكنك استخدام الموقع على متصفح الهاتف.',
        },
        {
          q: 'ماذا لو نسيت كلمة المرور؟',
          a: 'لا نخزن كلمات مرور. استخدم خاصية "تسجيل دخول بـ Google".',
        },
        {
          q: 'لماذا الموقع بطيء أحياناً؟',
          a: 'قد يكون الانترنت أو الخادم. حاول الانتظار أو تحديث الصفحة.',
        },
      ],
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
          <h1 className="text-4xl font-bold text-amber-900">الأسئلة الشائعة</h1>
          <p className="text-amber-700 mt-2">إجابات على أسئلتك الشائعة</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          {faqItems.map((section, sectionIdx) => (
            <section key={sectionIdx}>
              <h2 className="text-2xl font-bold text-amber-900 mb-6 pb-3 border-b-2 border-red-600">
                {section.category}
              </h2>
              <div className="space-y-4">
                {section.items.map((item, itemIdx) => (
                  <details
                    key={itemIdx}
                    className="group border border-amber-200 rounded-lg p-4 hover:bg-white transition cursor-pointer"
                  >
                    <summary className="flex justify-between items-center font-bold text-amber-900 select-none hover:text-red-600">
                      {item.q}
                      <CheckCircle className="w-5 h-5 text-red-600 group-open:hidden" />
                      <span className="group-open:inline hidden">✓</span>
                    </summary>
                    <p className="text-amber-700 mt-4">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}

          {/* Still Have Questions */}
          <div className="bg-amber-50 border-2 border-red-600 rounded-lg p-8 text-center space-y-4">
            <h3 className="text-xl font-bold text-amber-900">هل لديك أسئلة أخرى؟</h3>
            <p className="text-amber-700">
              لم تجد إجابة؟ لا تقلق، فريقنا هنا للمساعدة.
            </p>
            <Link
              href="/contact"
              className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
            >
              اتصل بنا
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
