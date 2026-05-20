// src/app/page.tsx
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/app/landing'

export const metadata: Metadata = {
  title: 'Wasiyati — رسائلك تعيش بعدك',
  description:
    'احفظ رسائلك الأخيرة، وصاياك، وأسرارك — تُرسَل تلقائياً إلى أحبائك في الوقت المناسب. منصة آمنة وموثوقة لإرث رقمي حقيقي.',
  keywords: [
    'وصية رقمية',
    'رسالة بعد الوفاة',
    'digital legacy',
    'dead mans switch',
    'إرث رقمي',
  ],
  openGraph: {
    title: 'Wasiyati — رسائلك تعيش بعدك',
    description:
      'احفظ رسائلك الأخيرة، وصاياك، وأسرارك — تُرسَل تلقائياً إلى أحبائك في الوقت المناسب.',
    url: 'https://wasiyati.app',
    siteName: 'Wasiyati',
    locale: 'ar_SA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wasiyati — رسائلك تعيش بعدك',
    description:
      'احفظ رسائلك الأخيرة، وصاياك، وأسرارك — تُرسَل تلقائياً إلى أحبائك في الوقت المناسب.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')
  return <LandingPage />
}
