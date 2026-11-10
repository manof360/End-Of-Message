import type { Metadata, Viewport } from 'next'
import { Tajawal } from 'next/font/google'
import './globals.css'
import './public.css'
import { Providers } from '@/components/layout/Providers'
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/site'

const tajawal = Tajawal({ subsets: ['arabic', 'latin'], weight: ['300', '400', '500', '700'], variable: '--font-tajawal' })

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 5, userScalable: true,
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#FDF8F0' }, { media: '(prefers-color-scheme: dark)', color: '#15120e' }],
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  // Public pages opt in explicitly. Protected routes inherit noindex.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  formatDetection: { email: false, address: false, telephone: false },
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return <html lang="ar" dir="rtl" className={`${tajawal.variable} scroll-smooth`} suppressHydrationWarning>
    <body className="bg-[#FDF8F0] dark:bg-[#0A0804] font-tajawal antialiased transition-colors"><Providers>{children}</Providers></body>
  </html>
}
