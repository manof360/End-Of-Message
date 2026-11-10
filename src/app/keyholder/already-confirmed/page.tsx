import Link from 'next/link'
import { InfoPage } from '@/components/public/PublicShell'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata('سبق تأكيد الرابط', 'صفحة العودة لرابط شاهد سبق تأكيده في وصيتي.', '/keyholder/already-confirmed', false)

export default function AlreadyConfirmedPage(): React.ReactElement {
  return <InfoPage label="الشاهد الموثوق" title="سبق تأكيد هذا الرابط" description="إذا انتقلت إلى هنا من رابط التأكيد، فالطلب مؤكد سابقاً ولا يحتاج إلى تكراره."><section><h2>المتابعة</h2><p>هذه الصفحة لا تعرض بيانات خاصة أو حالة تسليم الرسائل.</p><div className="public-inline-links"><Link href="/">العودة إلى وصيتي</Link></div></section></InfoPage>
}
