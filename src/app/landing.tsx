import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Heart, Lock, Clock, Users, CheckCircle, Shield, MessageCircle, Zap } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F0] to-[#FAF5ED]">
      {/* Navigation */}
      <nav
        className="sticky top-0 z-50 border-b border-amber-200 bg-[#FDF8F0]/95 backdrop-blur-sm"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Heart className="w-6 h-6 text-red-600 fill-red-600" aria-hidden="true" />
              <span className="text-xl font-bold text-amber-900">Wasiyati</span>
              <span className="text-xs text-amber-600">وصيتي</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-amber-900 hover:text-amber-600 transition">
                المميزات
              </a>
              <a href="#how-it-works" className="text-amber-900 hover:text-amber-600 transition">
                كيف يعمل
              </a>
              <a href="#faq" className="text-amber-900 hover:text-amber-600 transition">
                الأسئلة الشائعة
              </a>
              <a href="#security" className="text-amber-900 hover:text-amber-600 transition">
                الأمان
              </a>
              <Link
                href="/login"
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                دخول
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="space-y-6">
          <h1 className="text-5xl sm:text-6xl font-bold text-amber-900">
            رسائلك تعيش <span className="text-red-600">بعدك</span>
          </h1>
          <p className="text-xl text-amber-700 max-w-2xl mx-auto">
            احفظ رسائلك الأخيرة، وصاياك، وأسرارك — تُرسَل تلقائياً إلى أحبائك في الوقت المناسب.
            منصة آمنة وموثوقة لإرث رقمي حقيقي.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link
              href="/login?signup=true"
              className="px-8 py-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition text-lg"
            >
              ابدأ الآن مجاناً
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 border-2 border-amber-600 text-amber-900 rounded-lg font-semibold hover:bg-amber-50 transition text-lg"
            >
              تعرف على الآلية
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20 border-t border-b border-amber-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-amber-900 mb-16">المميزات الرئيسية</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4 text-center">
              <Shield className="w-12 h-12 text-red-600 mx-auto" aria-hidden="true" />
              <h3 className="text-xl font-bold text-amber-900">التشفير الكامل</h3>
              <p className="text-amber-700">
                رسائلك محمية بأعلى معايير التشفير. حتى نحن لا نستطيع قراءتها.
              </p>
            </div>
            <div className="space-y-4 text-center">
              <Clock className="w-12 h-12 text-red-600 mx-auto" aria-hidden="true" />
              <h3 className="text-xl font-bold text-amber-900">إرسال ذكي</h3>
              <p className="text-amber-700">
                حدد متى تُرسَل الرسائل. نحن نرقب — إذا توقفتَ عن الدخول ستُرسَل الرسائل.
              </p>
            </div>
            <div className="space-y-4 text-center">
              <Users className="w-12 h-12 text-red-600 mx-auto" aria-hidden="true" />
              <h3 className="text-xl font-bold text-amber-900">مستقبلون متعددون</h3>
              <p className="text-amber-700">
                أرسل رسائل مختلفة إلى أشخاص مختلفين حسب رغبتك.
              </p>
            </div>
            <div className="space-y-4 text-center">
              <Zap className="w-12 h-12 text-red-600 mx-auto" aria-hidden="true" />
              <h3 className="text-xl font-bold text-amber-900">موثوقية عالية</h3>
              <p className="text-amber-700">
                إعادة محاولة تلقائية وتتبع دقيق لكل رسالة.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-amber-900 mb-16">كيف يعمل</h2>
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/2 text-center">
                <div
                  className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto"
                  aria-label="Step 1"
                >
                  1
                </div>
              </div>
              <div className="md:w-1/2 space-y-2">
                <h3 className="text-2xl font-bold text-amber-900">سجّل حسابك</h3>
                <p className="text-amber-700 text-lg">
                  إنشاء حسابك بسيط وآمن. استخدم بريدك الإلكتروني أو حسابك على Google.
                </p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row-reverse items-center gap-8">
              <div className="md:w-1/2 text-center">
                <div
                  className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto"
                  aria-label="Step 2"
                >
                  2
                </div>
              </div>
              <div className="md:w-1/2 space-y-2">
                <h3 className="text-2xl font-bold text-amber-900">اكتب رسائلك</h3>
                <p className="text-amber-700 text-lg">
                  اكتب رسالتك أو وصيتك. أضف أشخاص تريد أن يستقبلوا الرسالة.
                </p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/2 text-center">
                <div
                  className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto"
                  aria-label="Step 3"
                >
                  3
                </div>
              </div>
              <div className="md:w-1/2 space-y-2">
                <h3 className="text-2xl font-bold text-amber-900">حدد شروط الإرسال</h3>
                <p className="text-amber-700 text-lg">
                  حدد عدد الأيام بدون تسجيل دخول قبل الإرسال التلقائي.
                </p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row-reverse items-center gap-8">
              <div className="md:w-1/2 text-center">
                <div
                  className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto"
                  aria-label="Step 4"
                >
                  4
                </div>
              </div>
              <div className="md:w-1/2 space-y-2">
                <h3 className="text-2xl font-bold text-amber-900">استرخِ وعش حياتك</h3>
                <p className="text-amber-700 text-lg">
                  كل ما عليك هو تسجيل الدخول بانتظام. نحن نرقب الباقي.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-white py-20 border-t border-b border-amber-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-amber-900 mb-16">حالات الاستخدام</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 border border-amber-200 rounded-lg hover:shadow-lg transition">
              <Heart className="w-8 h-8 text-red-600 mb-4" aria-hidden="true" />
              <h3 className="text-xl font-bold text-amber-900 mb-2">الرسائل الشخصية</h3>
              <p className="text-amber-700">
                اترك رسائل حب وتقدير وشكر لأحبائك. قد تصل بعد سنوات من كتابتك لها.
              </p>
            </div>
            <div className="p-6 border border-amber-200 rounded-lg hover:shadow-lg transition">
              <Lock className="w-8 h-8 text-red-600 mb-4" aria-hidden="true" />
              <h3 className="text-xl font-bold text-amber-900 mb-2">الوصايا والتعليمات</h3>
              <p className="text-amber-700">
                وثّق وصاياك، تعليمات الحسابات، كلمات المرور (بشكل آمن)، والمعلومات المهمة.
              </p>
            </div>
            <div className="p-6 border border-amber-200 rounded-lg hover:shadow-lg transition">
              <Users className="w-8 h-8 text-red-600 mb-4" aria-hidden="true" />
              <h3 className="text-xl font-bold text-amber-900 mb-2">الحفاظ على الإرث</h3>
              <p className="text-amber-700">
                احفظ حكاياتك وتجاربك وحكمتك للأجيال القادمة.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-amber-900 mb-16">الأسئلة الشائعة</h2>
          <div className="space-y-6">
            {[
              {
                q: 'هل رسائلي آمنة حقاً؟',
                a: 'نعم تماماً. استخدمنا أعلى معايير التشفير (AES-256). رسائلك مشفرة طرفياً، لا أحد يستطيع قراءتها إلا المستقبل.',
              },
              {
                q: 'ماذا يحدث إذا توقفت عن استخدام الخدمة؟',
                a: 'إذا توقفتَ عن تسجيل الدخول للفترة المحددة (30 يوم مثلاً)، ستُرسَل رسائلك تلقائياً.',
              },
              {
                q: 'هل يمكنني تعديل الرسائل بعد إنشاؤها؟',
                a: 'نعم، يمكنك تعديل أو حذف رسالة ما لم تُرسَل. بعد الإرسال، لا يمكن تعديلها.',
              },
              {
                q: 'هل تحتاج معلومات خاصة عني؟',
                a: 'لا. نستخدم فقط بريدك الإلكتروني. لا نجمع معلومات شخصية إضافية.',
              },
              {
                q: 'هل الخدمة مجانية؟',
                a: 'نعم، النسخة الأساسية مجانية تماماً. قد نوفر نسخة مدفوعة في المستقبل بمميزات إضافية.',
              },
              {
                q: 'كم عدد الرسائل التي يمكنني كتابتها؟',
                a: 'بلا حد. اكتب أي عدد من الرسائل التي تريدها.',
              },
            ].map((item, i) => (
              <details
                key={i}
                className="group border border-amber-200 rounded-lg p-4 hover:bg-amber-50 transition cursor-pointer"
              >
                <summary className="flex justify-between items-center font-bold text-amber-900 select-none">
                  {item.q}
                  <CheckCircle className="w-5 h-5 text-red-600 group-open:hidden" aria-hidden="true" />
                  <span className="group-open:inline hidden" aria-hidden="true">✓</span>
                </summary>
                <p className="text-amber-700 mt-4">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="bg-white py-20 border-t border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-amber-900 mb-12">الأمان والخصوصية</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-red-600" aria-hidden="true" />
                التشفير
              </h3>
              <ul className="space-y-2 text-amber-700">
                <li>✓ تشفير AES-256 للرسائل</li>
                <li>✓ تشفير HTTPS لجميع الاتصالات</li>
                <li>✓ عدم تخزين كلمات المرور (Google OAuth)</li>
                <li>✓ لا توجد نسخ احتياطية غير محمية</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                <Lock className="w-6 h-6 text-red-600" aria-hidden="true" />
                الخصوصية
              </h3>
              <ul className="space-y-2 text-amber-700">
                <li>✓ لا نشارك بيانات مع أطراف ثالثة</li>
                <li>✓ لا نستخدم تتبع أو إعلانات</li>
                <li>✓ معايير GDPR و privacy by design</li>
                <li>✓ يمكنك طلب حذف جميع بيانات حسابك</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 text-center bg-gradient-to-b from-[#FDF8F0] to-[#FAF5ED]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-amber-900 mb-6">ابدأ اليوم</h2>
          <p className="text-xl text-amber-700 mb-8">
            انضم إلى الآلاف الذين سجلوا إرثهم الرقمي.
          </p>
          <Link
            href="/login?signup=true"
            className="px-8 py-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition text-lg inline-block"
          >
            إنشاء حساب مجاني الآن
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-amber-900 text-amber-50 py-12 border-t border-amber-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 fill-red-500 text-red-500" aria-hidden="true" />
                Wasiyati
              </h4>
              <p className="text-sm text-amber-100">
                منصة آمنة لحفظ إرثك الرقمي وإرسال رسائلك إلى الأحبّاء.
              </p>
            </div>
            <nav aria-label="Footer Links">
              <h4 className="font-bold mb-4">الروابط</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#features" className="hover:text-white transition">
                    المميزات
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-white transition">
                    كيف يعمل
                  </a>
                </li>
                <li>
                  <a href="/faq" className="hover:text-white transition">
                    الأسئلة الشائعة
                  </a>
                </li>
              </ul>
            </nav>
            <nav aria-label="Legal">
              <h4 className="font-bold mb-4">القانونية</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-white transition">
                    سياسة الخصوصية
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition">
                    شروط الاستخدام
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-white transition">
                    من نحن
                  </Link>
                </li>
              </ul>
            </nav>
            <nav aria-label="Contact">
              <h4 className="font-bold mb-4">التواصل</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/contact" className="hover:text-white transition">
                    اتصل بنا
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:support@wasiyati.app"
                    className="hover:text-white transition"
                  >
                    support@wasiyati.app
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <div className="border-t border-amber-800 pt-8 text-center text-sm">
            <p className="text-amber-100">
              © 2026 Wasiyati. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
