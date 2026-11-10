import Link from 'next/link'
import { InfoPage } from '@/components/public/PublicShell'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata('نتيجة تأكيد الشاهد', 'صفحة العودة بعد معالجة رابط تأكيد الشاهد في وصيتي.', '/keyholder/confirmed', false)

export default function ConfirmedPage(): React.ReactElement {
  return <InfoPage label="الشاهد الموثوق" title="شكراً لتأكيدك" description="إذا انتقلت إلى هنا من رابط التأكيد، فقد انتهت معالجة طلبك. حالة وصول البريد تعتمد على خدمة الإرسال."><section><h2>الخطوة التالية</h2><p>لا تحتاج إلى تكرار الطلب. هذه الصفحة لا تعرض بيانات صاحب الحساب أو محتوى رسائله، ولا تمثل إثبات تسليم للمستلمين.</p><div className="public-inline-links"><Link href="/">العودة إلى وصيتي</Link></div></section></InfoPage>
}
