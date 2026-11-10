import { InfoPage } from '@/components/public/PublicShell'
import { features } from '@/components/public/content'
import { pageMetadata } from '@/lib/site'
import Link from 'next/link'

export const metadata = pageMetadata('المميزات والحدود الحالية', 'رسائل نصية، مستلمون متعددون، ثلاثة محفزات للإرسال، تأكيد حضور ونسخة Google Drive عند توفر الاتصال. تعرف على الحدود الفعلية.', '/features')

export default function FeaturesPage(): React.ReactElement {
  return <InfoPage label="المميزات" title="ما يمكنك فعله في وصيتي" description="أدوات لكتابة رسالتك وترتيب إرسالها، مع توضيح ما هو متاح الآن.">
    <section><h2>من كتابة الرسالة إلى متابعة حالتها</h2><div className="public-feature-grid">{features.map(({ icon: Icon, title, description }) => <article className="public-feature" key={title}><span className="public-feature-icon"><Icon size={24} aria-hidden="true" /></span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
    <section><h2>اختر طريقة التفعيل</h2><ul><li><strong>تاريخ محدد:</strong> تصبح الرسالة النشطة مستحقة للمعالجة عند حلول الموعد.</li><li><strong>مفتاح الغياب:</strong> يحتاج إلى تفعيل من إعداداته ومتابعة حضورك. يبدأ مسار التحذيرات عند تجاوز المهلة.</li><li><strong>الشاهد الموثوق:</strong> أضف شخصاً تثق به؛ تأكيده يفعّل الرسائل النشطة المرتبطة بالشاهد أو الغياب.</li></ul></section>
    <section><h2>حدود الاستخدام</h2><div className="public-table-wrap"><table><caption>الحدود الحالية لحفظ الرسائل والشهود</caption><thead><tr><th scope="col">العنصر</th><th scope="col">الحد</th></tr></thead><tbody><tr><th scope="row">عنوان الرسالة</th><td>200 حرف</td></tr><tr><th scope="row">نص الرسالة</th><td>10000 حرف</td></tr><tr><th scope="row">المستلمون لكل رسالة</th><td>حتى 10</td></tr><tr><th scope="row">الخطة المجانية</th><td>رسالة واحدة وشاهد واحد</td></tr><tr><th scope="row">الخطة الأساسية</th><td>5 رسائل وشاهدان</td></tr><tr><th scope="row">الخطة بريميوم</th><td>999 رسالة و5 شهود</td></tr></tbody></table></div><p>شراء الترقية والدفع داخل التطبيق غير مفعّلين حالياً.</p></section>
    <aside className="public-note"><h2>ما الذي لم يُفعّل بعد؟</h2><p>الإرسال الفعلي عبر SMS وWhatsApp، وإنشاء رسائل صوتية أو فيديو، وحذف الحساب ذاتياً. حالة الإرسال المعروضة ليست إثباتاً لقراءة الرسالة أو وصولها إلى صندوق البريد. لا تُرسل المهام المجدولة بالضرورة في الدقيقة المختارة.</p><Link href="/faq">اقرأ الأسئلة الشائعة</Link></aside>
  </InfoPage>
}
