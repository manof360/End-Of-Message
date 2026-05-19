import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Heart } from 'lucide-react'

export const metadata: Metadata = {
  title: 'من نحن — Wasiyati',
  description: 'تعرف على Wasiyati وقصتنا وفريقنا والرؤية التي تحركنا.',
  openGraph: {
    title: 'من نحن — Wasiyati',
    url: 'https://wasiyati.app/about',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F0] to-[#FAF5ED]">
      {/* Header */}
      <div className="border-b border-amber-200 bg-[#FDF8F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            العودة للرئيسية
          </Link>
          <h1 className="text-4xl font-bold text-amber-900">من نحن</h1>
          <p className="text-amber-700 mt-2">قصتنا ورسالتنا</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          <section>
            <h2 className="text-3xl font-bold text-amber-900 mb-6">عن Wasiyati</h2>
            <p className="text-lg text-amber-700 leading-relaxed">
              Wasiyati (وصيتي) هي منصة رقمية تمنحك الفرصة لترك إرثك. نؤمن أن الرسائل الأخيرة هي
              من أثمن الأشياء التي قد نتركها. قد تصل بعد سنوات، لكنها تحمل قيمة أبدية.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-amber-900 mb-6">الرؤية</h2>
            <div className="bg-white border border-amber-200 rounded-lg p-8 space-y-4">
              <p className="text-lg text-amber-700">
                عالم حيث الرسائل الأخيرة محمية وآمنة، والذكريات تعيش للأبد، والأحبّاء يتلقون كلمات
                الحب والشكر والتوجيه حتى بعد الرحيل.
              </p>
              <p className="text-lg text-amber-700">
                نرى Wasiyati كـ "الخزينة الرقمية" التي تحفظ أنفسنا الأفضل.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-amber-900 mb-6">القيم الأساسية</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="border-l-4 border-red-600 pl-6 space-y-2">
                <h3 className="text-xl font-bold text-amber-900">الخصوصية</h3>
                <p className="text-amber-700">
                  رسائلك ملك لك وحدك. لا نقرأها ولا نشاركها.
                </p>
              </div>
              <div className="border-l-4 border-red-600 pl-6 space-y-2">
                <h3 className="text-xl font-bold text-amber-900">الأمان</h3>
                <p className="text-amber-700">
                  التشفير والحماية قصوى. بياناتك محمية بأعلى المعايير.
                </p>
              </div>
              <div className="border-l-4 border-red-600 pl-6 space-y-2">
                <h3 className="text-xl font-bold text-amber-900">الموثوقية</h3>
                <p className="text-amber-700">
                  رسالتك ستصل. نحن ملتزمون بالإيصال 100%.
                </p>
              </div>
              <div className="border-l-4 border-red-600 pl-6 space-y-2">
                <h3 className="text-xl font-bold text-amber-900">البساطة</h3>
                <p className="text-amber-700">
                  كل شيء سهل وواضح. لا تعقيد لا غموض.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-amber-900 mb-6">الفريق</h2>
            <div className="bg-white border border-amber-200 rounded-lg p-8 space-y-4">
              <p className="text-lg text-amber-700">
                Wasiyati بُنيت بشغف من قبل فريق مخصص يؤمن بأهمية الذكريات الرقمية والإرث الإنساني.
              </p>
              <p className="text-lg text-amber-700">
                نحن متخصصون في الأمان وتطوير الويب والتصميم. نعمل يومياً لتحسين الخدمة وضمان حماية
                بيانات مستخدمينا.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-amber-900 mb-6">التاريخ</h2>
            <div className="space-y-4 text-amber-700">
              <div className="flex gap-4">
                <div className="text-red-600 font-bold">2024</div>
                <div>
                  <p className="font-bold text-amber-900">النشأة</p>
                  <p>بدأت Wasiyati كفكرة لحل مشكلة حقيقية: كيف نترك رسائل آمنة لأحبائنا؟</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-red-600 font-bold">2025</div>
                <div>
                  <p className="font-bold text-amber-900">التطوير</p>
                  <p>بنينا النسخة الأولى مع أعلى معايير الأمان والتشفير.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-red-600 font-bold">2026</div>
                <div>
                  <p className="font-bold text-amber-900">الإطلاق</p>
                  <p>أطلقنا Wasiyati للعالم. الآن يمكن للملايين ترك إرثهم بأمان.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-amber-900 mb-6">التكنولوجيا</h2>
            <div className="bg-white border border-amber-200 rounded-lg p-8 space-y-4">
              <p className="text-amber-700">
                Wasiyati مبنية على تقنيات قوية وموثوقة:
              </p>
              <ul className="space-y-2 text-amber-700">
                <li>✓ Next.js 14 للأداء العالية</li>
                <li>✓ PostgreSQL لقاعدة بيانات قوية</li>
                <li>✓ AES-256 للتشفير</li>
                <li>✓ Google Cloud للاستضافة الآمنة</li>
                <li>✓ NextAuth لعدم تخزين كلمات المرور</li>
              </ul>
            </div>
          </section>

          <section className="bg-amber-50 border border-amber-200 rounded-lg p-8 space-y-4">
            <h2 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-600 fill-red-600" />
              شكراً لثقتك
            </h2>
            <p className="text-amber-700">
              شكراً لاختيارك Wasiyati. نحن ملتزمون بحماية رسائلك وتحقيق رؤيتنا.
            </p>
            <p className="text-amber-700">
              إذا كان لديك أي أسئلة أو اقتراحات، لا تتردد في التواصل معنا.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
