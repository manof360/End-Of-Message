// src/app/login/page.tsx
'use client'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) router.push('/dashboard')
  }, [session, router])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    await signIn('google', { callbackUrl: '/dashboard' })
  }

  if (status === 'loading') return <main className="public-login min-h-screen bg-[#1A1208] text-[#FDF8F0] flex flex-col gap-4 items-center justify-center" dir="rtl"><h1>تسجيل الدخول إلى حسابك</h1><p role="status">جارٍ التحقق من الجلسة…</p></main>

  return (
    <main className="public-login min-h-screen bg-[#1A1208] flex items-center justify-center px-4 py-8" dir="rtl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[300px] sm:h-[400px] bg-[#D4A017] opacity-[0.04] rounded-full blur-[80px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <Link href="/" className="inline-block text-[#e2ba71] text-sm mb-5 py-2">العودة إلى وصيتي</Link>
        {/* Card */}
        <div className="bg-[#2A1F0E] border border-[rgba(184,134,11,0.25)] rounded-xl md:rounded-2xl p-6 md:p-10 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-6 md:mb-10">
            <p className="text-3xl md:text-4xl font-bold text-[#FDF8F0] mb-2">
              وصي<span className="text-[#D4A017]">تي</span>
            </p>
            <p className="text-[#c2b4a0] text-xs md:text-sm">
              اكتب لأحبائك، وحدد شرط إرسال رسالتك
            </p>
          </div>

          {/* Divider with text */}
          <div className="relative mb-6 md:mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(184,134,11,0.15)]" />
            </div>
            <div className="relative flex justify-center">
              <h1 className="bg-[#2A1F0E] px-4 text-[#c2b4a0] text-sm">تسجيل الدخول إلى حسابك</h1>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            aria-busy={loading}
            className="w-full flex items-center justify-center gap-3 bg-[#FDF8F0] hover:bg-white text-[#1A1208] font-medium py-3 md:py-4 px-4 md:px-6 rounded-lg md:rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed group text-sm md:text-base"
          >
            {loading ? (
              <div aria-hidden="true" className="w-5 h-5 border-2 border-[#1A1208] border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            <span className="truncate">{loading ? 'جارٍ تسجيل الدخول...' : 'الدخول عبر Google'}</span>
          </button>

          {/* Info */}
          <div className="mt-4 md:mt-6 space-y-2">
            <div className="flex items-start gap-2 text-[#c2b4a0] text-xs">
              <span className="text-[#D4A017] mt-0.5 flex-shrink-0">✓</span>
              <span>تُحاول مزامنة نسخة إلى Google Drive عند توفر الاتصال والصلاحيات</span>
            </div>
            <div className="flex items-start gap-2 text-[#c2b4a0] text-xs">
              <span className="text-[#D4A017] mt-0.5 flex-shrink-0">✓</span>
              <span>الخادم يخزن محتوى الرسائل ويعالجه للإرسال؛ لا يتوفر تشفير طرفي</span>
            </div>
            <div className="flex items-start gap-2 text-[#c2b4a0] text-xs">
              <span className="text-[#D4A017] mt-0.5 flex-shrink-0">✓</span>
              <span>الخطة المجانية تتيح رسالة واحدة وشاهداً واحداً</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[#c2b4a0] text-xs mt-6 px-2">
          قبل الدخول، راجع{' '}
          <a href="/privacy" className="text-[#e2ba71] hover:underline">معلومات الخصوصية</a>
          {' '}و{' '}
          <a href="/terms" className="text-[#e2ba71] hover:underline">مسودة الشروط غير المعتمدة</a>
        </p>
      </div>
    </main>
  )
}
