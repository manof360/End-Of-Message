import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'شروط الاستخدام — Wasiyati',
  description: 'اقرأ شروط استخدام خدمة Wasiyati والحقوق والالتزامات.',
  openGraph: {
    title: 'شروط الاستخدام — Wasiyati',
    url: 'https://wasiyati.app/terms',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F0] to-[#FAF5ED]">
      {/* Header */}
      <div className="border-b border-amber-200 bg-[#FDF8F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            العودة للرئيسية
          </Link>
          <h1 className="text-4xl font-bold text-amber-900">شروط الاستخدام</h1>
          <p className="text-amber-700 mt-2">آخر تحديث: مايو 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none text-amber-900 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">قبول الشروط</h2>
            <p className="text-amber-700">
              باستخدام Wasiyati ("الخدمة")، توافق على هذه الشروط. إذا لم توافق، لا تستخدم الخدمة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">الحساب والمسؤولية</h2>
            <div className="space-y-4 text-amber-700">
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>أنت مسؤول عن سرية بيانات حسابك</li>
                <li>
                  أنت مسؤول عن جميع الأنشطة تحت حسابك
                </li>
                <li>
                  يجب أن تكون ≥ 18 سنة أو بموافقة والديك
                </li>
                <li>
                  عليك تقديم معلومات دقيقة صحيحة
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">محتوى المستخدم</h2>
            <div className="space-y-4 text-amber-700">
              <p>أنت تحتفظ بحقوق محتوى رسائلك. بإنشاء رسالة، تمنح Wasiyati ترخيصاً لـ:</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>تخزين الرسالة بشكل آمن</li>
                <li>معالجة الرسالة</li>
                <li>إرسال الرسالة إلى المستقبلين</li>
                <li>الاحتفاظ بسجل للتسليم</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">محتوى محظور</h2>
            <div className="space-y-4 text-amber-700">
              <p>لا يجوز استخدام الخدمة لـ:</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>محتوى غير قانوني أو يحتوي على كراهية</li>
                <li>الابتزاز أو التهديد</li>
                <li>اختراق أو القرصنة</li>
                <li>الاحتيال أو الخداع</li>
                <li>انتهاك حقوق الآخرين</li>
                <li>محتوى جنسي صريح (بدون السياق)</li>
              </ul>
              <p className="font-bold text-red-600">
                Wasiyati تحتفظ بحق إزالة المحتوى المخالف وإغلاق الحساب.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">الخدمات والتوفر</h2>
            <div className="space-y-4 text-amber-700">
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>
                  الخدمة مقدمة "كما هي" بدون ضمانات
                </li>
                <li>
                  قد نصيانة الخدمة أو تحسينها (قد تؤدي لأسفل)
                </li>
                <li>
                  لا نضمن عدم فقدان البيانات، لكننا نحاول
                </li>
                <li>
                  Wasiyati غير مسؤولة عن تأخير الرسائل
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">التحديثات والتغييرات</h2>
            <div className="space-y-4 text-amber-700">
              <p>
                قد نغيّر أو نحسّن الخدمة في أي وقت. قد نحتاج لتغيير الشروط. إذا رفضت التغييرات، قد تحتاج لحذف حسابك.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">الحدود من المسؤولية</h2>
            <div className="space-y-4 text-amber-700">
              <p>
                <strong>Wasiyati غير مسؤولة عن:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>فقدان البيانات أو البريد غير المُسلّم</li>
                <li>الضرر غير المباشر أو الخسائر</li>
                <li>أعطال الخوادم أو الانقطاعات</li>
                <li>أخطاء بسبب الأطراف الثالثة</li>
              </ul>
              <p className="font-bold">
                المسؤولية الكاملة محدودة بسعر ما دفعتَ (مجاني = 0).
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">التعويض</h2>
            <div className="space-y-4 text-amber-700">
              <p>
                توافق على تعويض Wasiyati من أي مطالبات ناتجة عن استخدامك غير القانوني أو انتهاكك لهذه الشروط.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">إلغاء الحساب</h2>
            <div className="space-y-4 text-amber-700">
              <p>
                يمكنك حذف حسابك في أي وقت من الإعدادات. سيؤدي هذا إلى حذف بيانات (مع استثناءات قانونية).
              </p>
              <p>
                Wasiyati قد تحذف الحسابات غير النشطة بعد سنة واحدة.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">القانون الحاكم</h2>
            <div className="space-y-4 text-amber-700">
              <p>
                هذه الشروط تخضع للقوانين المحلية حيث تعمل Wasiyati.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">النزاعات</h2>
            <div className="space-y-4 text-amber-700">
              <p>
                أي نزاع يتم حله أولاً عبر التفاوض الودي. إذا فشل، قد يتم تحويله إلى المحاكم المختصة.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-amber-900 mb-4">التواصل</h2>
            <div className="space-y-4 text-amber-700">
              <p>
                لأي أسئلة عن الشروط:
              </p>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p>
                  <a
                    href="mailto:legal@wasiyati.app"
                    className="text-red-600 hover:text-red-700"
                  >
                    legal@wasiyati.app
                  </a>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
