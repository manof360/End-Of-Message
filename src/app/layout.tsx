// src/app/layout.tsx
import type { Metadata } from 'next'
import { Tajawal } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/layout/Providers'

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-tajawal',
})

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
    'رسائل آمنة',
  ],
  authors: [{ name: 'Wasiyati Team' }],
  creator: 'Wasiyati',
  publisher: 'Wasiyati',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    url: 'https://wasiyati.app',
    siteName: 'Wasiyati',
    title: 'Wasiyati — رسائلك تعيش بعدك',
    description:
      'احفظ رسائلك الأخيرة، وصاياك، وأسرارك — تُرسَل تلقائياً إلى أحبائك في الوقت المناسب.',
    images: [
      {
        url: 'https://wasiyati.app/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Wasiyati',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wasiyati — رسائلك تعيش بعدك',
    description:
      'احفظ رسائلك الأخيرة، وصاياك، وأسرارك — تُرسَل تلقائياً إلى أحبائك في الوقت المناسب.',
    images: ['https://wasiyati.app/og-image.jpg'],
  },
  category: 'Technology',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Wasiyati',
    alternateName: 'وصيتي',
    description:
      'احفظ رسائلك الأخيرة، وصاياك، وأسرارك — تُرسَل تلقائياً إلى أحبائك في الوقت المناسب.',
    url: 'https://wasiyati.app',
    applicationCategory: 'ProductivityApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '100',
    },
    screenshot: 'https://wasiyati.app/screenshot.jpg',
    featureList: [
      'End-to-End Encryption',
      'Automatic Message Delivery',
      'Google Drive Integration',
      'Multi-recipient Support',
      'Dark Mode',
    ],
  }

  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} scroll-smooth`} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#1A1208" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0A0804" media="(prefers-color-scheme: dark)" />

        {/* Security Headers */}
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />

        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="https://accounts.google.com" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Canonical */}
        <link rel="canonical" href="https://wasiyati.app" />

        {/* Alternate links for language */}
        <link rel="alternate" hrefLang="ar" href="https://wasiyati.app" />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Wasiyati',
              url: 'https://wasiyati.app',
              email: 'support@wasiyati.app',
              sameAs: [
                'https://twitter.com/wasiyati',
                'https://github.com/wasiyati',
              ],
            }),
          }}
        />
      </head>
      <body className="bg-[#FDF8F0] dark:bg-[#0A0804] font-tajawal antialiased transition-colors">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
