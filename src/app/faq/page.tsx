import { InfoPage } from '@/components/public/PublicShell'
import { FaqList } from '@/components/public/FaqList'
import { pageMetadata } from '@/lib/site'
import Link from 'next/link'

export const metadata = pageMetadata('الأسئلة الشائعة', 'إجابات عن حساب Google، مجانية وصيتي وحدود الرسائل، مفتاح الغياب، البريد الإلكتروني، Google Drive وطريقة التعامل مع البيانات.', '/faq')

export default function FAQPage(): React.ReactElement {
  return <InfoPage label="الأسئلة الشائعة" title="كل ما تحتاج معرفته قبل رسالتك" description="إجابات واضحة عن الاستخدام، والإرسال، والبيانات والحدود الحالية."><section><h2>الحساب والرسائل والخصوصية</h2><FaqList /></section><section><h2>معلومات إضافية</h2><div className="public-inline-links"><Link href="/privacy">الخصوصية</Link><Link href="/security">معلومات الأمان</Link><Link href="/contact">التواصل</Link></div></section></InfoPage>
}
