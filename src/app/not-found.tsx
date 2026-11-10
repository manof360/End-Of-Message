import Link from 'next/link'
import { InfoPage } from '@/components/public/PublicShell'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata('الصفحة غير موجودة', 'لم نعثر على الصفحة المطلوبة. عد إلى الصفحة الرئيسية أو الأسئلة الشائعة.', '/404', false)

export default function NotFound(): React.ReactElement {
  return <InfoPage label="404" title="لم نعثر على هذه الصفحة" description="قد يكون الرابط غير صحيح أو لم تعد الصفحة متاحة."><section><h2>إلى أين تريد الانتقال؟</h2><div className="public-inline-links"><Link href="/">الصفحة الرئيسية</Link><Link href="/faq">الأسئلة الشائعة</Link><Link href="/login">تسجيل الدخول</Link></div></section></InfoPage>
}
