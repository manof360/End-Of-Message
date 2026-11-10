import Link from 'next/link'
import { InfoPage } from '@/components/public/PublicShell'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata('تعذر استخدام الرابط', 'الرابط غير صالح أو لم يعد متاحاً. راجع مرسل الرابط أو عد إلى الصفحة الرئيسية.', '/error', false)

export default function LinkErrorPage(): React.ReactElement {
  return <InfoPage label="مشكلة في الرابط" title="تعذر استخدام هذا الرابط" description="قد يكون الرابط غير صحيح أو لم يعد متاحاً. راجع الشخص الذي شاركه معك."><section><h2>الانتقال إلى وصيتي</h2><div className="public-inline-links"><Link href="/">الصفحة الرئيسية</Link><Link href="/faq">الأسئلة الشائعة</Link></div></section></InfoPage>
}
