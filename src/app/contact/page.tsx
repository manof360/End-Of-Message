import { InfoPage } from '@/components/public/PublicShell'
import { pageMetadata } from '@/lib/site'
import { Mail, Shield } from 'lucide-react'
import Link from 'next/link'

export const metadata = pageMetadata('التواصل', 'حالة قنوات التواصل في وصيتي وعناوين الدعم والأمان المؤقتة، مع روابط المعلومات والأسئلة الشائعة.', '/contact')

export default function ContactPage(): React.ReactElement {
  return <InfoPage label="التواصل" title="قنوات التواصل" description="معلومات الدعم المتاحة حالياً، دون نموذج إرسال غير مفعّل.">
    <aside className="public-note"><h2>قنوات الدعم قيد الإعداد</h2><p>لا يوجد حالياً نطاق أو بريد مفعّل للدعم. العنوانان أدناه مؤقتان إلى حين اعتماد بريد صحيح؛ لا نعِد باستلام الرسائل أو الرد عليها عبرهما.</p></aside>
    <section><h2>العناوين المؤقتة</h2><div className="public-contact-grid"><article className="public-feature"><Mail aria-hidden="true" /><h3>الدعم العام</h3><p><bdi>support@wasiyati.app</bdi></p><span className="public-status-label">غير مفعّل حالياً</span></article><article className="public-feature"><Shield aria-hidden="true" /><h3>الأمان</h3><p><bdi>security@wasiyati.app</bdi></p><span className="public-status-label">غير مفعّل حالياً</span></article></div></section>
    <section><h2>قد تجد إجابتك هنا</h2><div className="public-inline-links"><Link href="/faq">الأسئلة الشائعة</Link><Link href="/privacy">الخصوصية</Link><Link href="/security">معلومات الأمان</Link><a href="https://github.com/manof360/End-Of-Message" target="_blank" rel="noreferrer">مستودع المشروع على GitHub (يفتح في نافذة جديدة)</a></div></section>
  </InfoPage>
}
