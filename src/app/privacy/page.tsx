import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'سياسة الخصوصية — Wasiyati',
  description: 'تعرّف على كيفية تعاملنا ببيانات مستخدمينا وحقوقك في الخصوصية.',
  openGraph: {
    title: 'سياسة الخصوصية — Wasiyati',
    url: 'https://wasiyati.app/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F0] to-[#FAF5ED]">
      {/* Header */}
      <div className="border-b border-amber-200 bg-[#FDF8F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            العودة للرئيسية
          </Link>
          <h1 className="text-4xl font-bold text-amber-900">سياسة الخصوصية</h1>
          <p className="text-amber-700 mt-2">آخر تحديث: مايو 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none text-amber-900 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">مقدمة</h2>
            <p className="text-amber-700">
              يحترم Wasiyati خصوصيتك ويلتزم بحماية البيانات الشخصية. تشرح هذه السياسة كيفية جمعنا
              واستخدامنا وحمايتنا لبيانات المستخدمين.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">البيانات التي نجمعها</h2>
            <div className="space-y-4 text-amber-700">
              <p>
                نجمع البيانات الضرورية فقط لتشغيل الخدمة:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>بريدك الإلكتروني</li>
                <li>اسمك (اختياري)</li>
                <li>صورة ملفك الشخصي (من Google إذا استخدمتها)</li>
                <li>رسائلك والمحتوى الذي تكتبه</li>
                <li>معلومات المستقبلين (بريدهم فقط)</li>
                <li>تواريخ وأوقات الإجراءات (تسجيل دخول، إنشاء رسالة، إلخ)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">كيفية استخدام بيانات</h2>
            <div className="space-y-4 text-amber-700">
              <p>نستخدم بيانات فقط لـ:</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>تشغيل الخدمة وتسليم الرسائل</li>
                <li>المراقبة والنسخ الاحتياطية</li>
                <li>تحسين الأداء والموثوقية</li>
                <li>الامتثال للقوانين</li>
              </ul>
              <p className="font-bold">لا نستخدم بيانات للإعلانات أو البيع لأطراف ثالثة.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">التشفير والحماية</h2>
            <div className="space-y-4 text-amber-700">
              <p>
                جميع الرسائل مشفرة بـ AES-256. التشفير طرفي (end-to-end)، بمعنى أن محتوى رسائلك
                محمي حتى من موظفينا. الاتصالات بين جهازك وخوادمنا مشفرة بـ HTTPS/TLS.
              </p>
              <p>
                نستخدم قاعدة بيانات PostgreSQL محمية. كلمات المرور لا تُخزن (نستخدم Google
                OAuth)، والرموز محمية.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">مدة الاحتفاظ بالبيانات</h2>
            <div className="space-y-4 text-amber-700">
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>
                  <strong>الرسائل:</strong> تُحتفظ حتى الإرسال، ثم تُحفظ بشكل آمن ولا تُحذف
                </li>
                <li>
                  <strong>سجلات الوصول:</strong> تُحتفظ لمدة سنة لأسباب الأمان
                </li>
                <li>
                  <strong>حسابك:</strong> يبقى حتى تطلب الحذف
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">حقوقك</h2>
            <div className="space-y-4 text-amber-700">
              <p>لديك الحق في:</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>الوصول إلى بيانات حسابك</li>
                <li>طلب نسخة من بيانات (تصدير)</li>
                <li>تصحيح البيانات غير الدقيقة</li>
                <li>طلب حذف حسابك وجميع بيانات (مع الاستثناءات الضرورية)</li>
                <li>الاعتراض على معالجة بيانات معينة</li>
              </ul>
              <p>
                للمزيد، اتصل بنا على{' '}
                <a
                  href="mailto:privacy@wasiyati.app"
                  className="text-red-600 hover:text-red-700 underline"
                >
                  privacy@wasiyati.app
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">مشاركة البيانات</h2>
            <div className="space-y-4 text-amber-700">
              <p>
                لا نشارك بيانات مع أطراف ثالثة <strong>إلا</strong> في الحالات التالية:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>عند الاحتياج لإرسال الرسائل (مثل خدمات البريد)</li>
                <li>عند الامتثال للقوانين أو أوامر المحكمة</li>
                <li>لحماية الحقوق أو الأمان</li>
              </ul>
              <p>
                نستخدم خدمات تشغيل محايدة (cloud providers). يتم اختيار الخدمات بناءً على معايير
                الأمان والخصوصية.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">ملفات تعريف الارتباط (Cookies)</h2>
            <div className="space-y-4 text-amber-700">
              <p>
                نستخدم ملفات تعريف ضرورية فقط لتسجيل الدخول والجلسات. لا نستخدم ملفات تتبع أو
                إعلانية.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">الامتثال القانوني</h2>
            <div className="space-y-4 text-amber-700">
              <p>
                نمتثل بـ GDPR والقوانين المحلية. إذا كنت في دول معينة، قد تكون لديك حقوق إضافية.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">التغييرات على السياسة</h2>
            <div className="space-y-4 text-amber-700">
              <p>
                قد نحدّث هذه السياسة من وقتٍ لآخر. سنخبرك بالتغييرات المهمة عبر البريد أو الموقع.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">التواصل</h2>
            <div className="space-y-4 text-amber-700">
              <p>
                لأي أسئلة عن الخصوصية، اتصل بنا:
              </p>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p>
                  <strong>البريد الإلكتروني:</strong>{' '}
                  <a
                    href="mailto:privacy@wasiyati.app"
                    className="text-red-600 hover:text-red-700"
                  >
                    privacy@wasiyati.app
                  </a>
                </p>
                <p className="mt-2">
                  <strong>التواصل:</strong>{' '}
                  <Link href="/contact" className="text-red-600 hover:text-red-700">
                    صفحة التواصل
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
