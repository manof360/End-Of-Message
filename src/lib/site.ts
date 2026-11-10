import type { Metadata } from 'next'

// Single public URL setting; independent of auth, email and deployment settings.
export const SITE_URL = 'https://end-of-message.vercel.app'
export const SITE_NAME = 'وصيتي | Wasiyati'
export const SITE_DESCRIPTION = 'احفظ رسائل نصية لأحبائك وحدد إرسالها بالبريد الإلكتروني بتاريخ تختاره، أو عبر مفتاح الغياب أو تأكيد شاهد موثوق.'
export const PUBLIC_PATHS = ['/', '/about', '/features', '/faq', '/privacy', '/security', '/contact'] as const

export function pageMetadata(title: string, description: string, path: string, index = true): Metadata {
  const fullTitle = `${title} — ${SITE_NAME}`
  return {
    title: { absolute: fullTitle }, description,
    alternates: { canonical: `${SITE_URL}${path === '/' ? '' : path}` },
    robots: { index, follow: true, googleBot: { index, follow: true } },
    openGraph: {
      title: fullTitle, description, url: `${SITE_URL}${path === '/' ? '' : path}`,
      siteName: SITE_NAME, locale: 'ar_SA', type: 'website',
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: 'وصيتي — رسائل لمن يهمك أمرهم' }],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [`${SITE_URL}/opengraph-image`] },
  }
}
