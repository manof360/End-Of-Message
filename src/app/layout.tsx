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
  title: 'وصيتي | Wasiyati — رسائلك تعيش بعدك',
  description: 'سجّل رسائلك ووصاياك لأحبّائك — تُرسَل تلقائياً في الوقت المناسب.',
  keywords: ['وصية رقمية', 'رسالة بعد الوفاة', 'digital legacy', 'dead mans switch'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="bg-[#FDF8F0] font-tajawal antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
