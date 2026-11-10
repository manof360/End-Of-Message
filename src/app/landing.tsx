import Link from 'next/link'
import { ArrowUpLeft, CalendarDays, Heart, Mail, PenLine, Users } from 'lucide-react'
import { PublicShell } from '@/components/public/PublicShell'
import { FaqList } from '@/components/public/FaqList'
import { features, steps } from '@/components/public/content'
import { SITE_URL, SITE_DESCRIPTION } from '@/lib/site'
import type { ReactElement } from 'react'

export function LandingPage(): ReactElement {
  const schema = {
    '@context': 'https://schema.org', '@type': 'WebApplication', name: 'وصيتي | Wasiyati',
    url: SITE_URL, description: SITE_DESCRIPTION, inLanguage: 'ar',
    applicationCategory: 'LifestyleApplication', operatingSystem: 'Web browser',
    featureList: ['رسائل نصية', 'مستلمون متعددون', 'جدولة بتاريخ', 'مفتاح الغياب', 'شاهد موثوق', 'نسخة Google Drive عند توفر الاتصال'],
  }
  return <PublicShell>
    <main id="main-content" tabIndex={-1}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
      <section className="public-container public-hero" aria-labelledby="hero-title">
        <div className="public-hero-copy">
          <p className="public-eyebrow"><span /> مساحة لكلمات تستحق أن تصل</p>
          <h1 id="hero-title">اكتب لأحبائك اليوم.<br /><span>وحدد متى تصل رسالتك.</span></h1>
          <p className="public-lead">وصيتي يحفظ رسائلك النصية ويتيح إعداد إرسالها بالبريد الإلكتروني: بتاريخ تختاره، أو بعد غيابك وفق إعداداتك، أو عند تأكيد شاهد موثوق.</p>
          <p className="public-audience">لكل من يريد ترك كلمات شخصية أو تعليمات لمن يهمه أمرهم.</p>
          <div className="public-hero-actions"><Link className="public-button" href="/login">ابدأ رسالتك عبر Google <ArrowUpLeft size={20} aria-hidden="true" /></Link><a className="public-button public-button-outline" href="#how-it-works">كيف يعمل وصيتي؟</a></div>
          <p className="public-caption">خطة مجانية: رسالة واحدة وشاهد واحد. البريد الإلكتروني هو قناة الإرسال الحالية.</p>
        </div>
        <figure className="public-message-scene" aria-labelledby="preview-caption">
          <div className="public-scene-top"><span><PenLine size={16} aria-hidden="true" /> من فكرة إلى رسالة</span><span>01 / 03</span></div>
          <div className="public-letter">
            <span className="public-letter-label"><Mail size={17} aria-hidden="true" /> رسالة لمن تحب</span>
            <p className="public-letter-title">هناك كلمات،<br />تبقى قريبة دائماً.</p>
            <p>اكتب ما تود أن يتذكّره أحباؤك،<br />واختر من تصله كلماتك ومتى.</p>
            <div className="public-letter-lines" aria-hidden="true"><i /><i /><i /></div>
            <div className="public-letter-signature"><span>بكل محبة</span><Heart size={24} aria-hidden="true" /></div>
          </div>
          <div className="public-scene-bottom"><span><Users size={17} aria-hidden="true" /> اختر المستلمين</span><span><CalendarDays size={17} aria-hidden="true" /> حدد شرط الإرسال</span></div>
          <figcaption id="preview-caption">تصور توضيحي لرحلة الرسالة، وليس رسالة محفوظة أو تأكيد إرسال.</figcaption>
        </figure>
      </section>
      <div className="public-facts-strip"><div className="public-container"><span>كلماتك، بطريقتك</span><span>رسائل نصية</span><span>حتى 10 مستلمين للرسالة</span><span>3 خيارات لتفعيل الإرسال</span></div></div>
      <section className="public-container public-section" id="how-it-works" aria-labelledby="how-title">
        <div className="public-section-heading"><div><p className="public-eyebrow">خطوات بسيطة</p><h2 id="how-title">كيف يعمل؟</h2></div><p>من أول كلمة إلى إعداد الإرسال.<br />كل شيء يبدأ من لوحة التحكم.</p></div>
        <ol className="public-steps">{steps.map((step, i) => <li key={step.title}><span className="public-step-number">0{i + 1}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol>
      </section>
      <section className="public-section public-section-tinted" id="features" aria-labelledby="features-title"><div className="public-container">
        <div className="public-section-heading"><div><p className="public-eyebrow">ما يمكنك فعله</p><h2 id="features-title">رسالتك، وإعداداتها بين يديك</h2></div><Link className="public-text-link" href="/features">استكشف المميزات <ArrowUpLeft size={18} aria-hidden="true" /></Link></div>
        <div className="public-feature-grid">{features.map(({ icon: Icon, title, description }) => <article className="public-feature" key={title}><span className="public-feature-icon"><Icon size={23} aria-hidden="true" /></span><h3>{title}</h3><p>{description}</p></article>)}</div>
      </div></section>
      <section className="public-container public-section" aria-labelledby="uses-title"><div className="public-section-heading"><div><p className="public-eyebrow">لكلماتك أكثر من مناسبة</p><h2 id="uses-title">متى تستخدم وصيتي؟</h2></div></div>
        <div className="public-use-grid">
          <article><span>01 / كلمات من القلب</span><h3>رسالة لأحبائك</h3><p>كلمات امتنان أو قصة شخصية تريد أن تتركها لأفراد أسرتك أو لأصدقائك.</p></article>
          <article><span>02 / لحظة قادمة</span><h3>رسالة لمناسبة مستقبلية</h3><p>اكتب رسالة اليوم وحدد تاريخاً تصبح فيه مستحقة للمعالجة والإرسال.</p></article>
          <article><span>03 / تفاصيل تهمهم</span><h3>تعليمات شخصية</h3><p>دوّن إرشادات يحتاجها من تختارهم، دون تضمين كلمات مرور أو أسرار مالية.</p></article>
        </div>
        <aside className="public-note"><strong>قبل أن تبدأ</strong><p>مفتاح الغياب يعتمد على حضورك ولا يثبت الوفاة. الإرسال مرتبط بالخدمات والمعالجة المجدولة، ولا يُضمن وصوله في لحظة محددة. وصيتي ليس بديلاً عن توثيق الوصايا القانونية.</p><Link href="/security">اقرأ حدود الخدمة ومعلومات الأمان</Link></aside>
      </section>
      <section className="public-container public-section public-faq-section" id="faq" aria-labelledby="faq-title"><div><p className="public-eyebrow">إجابات قبل أول رسالة</p><h2 id="faq-title">أسئلة تستحق الوضوح</h2><p className="public-muted">عن الحساب والبيانات والإرسال،<br />وما هو متاح حالياً.</p><Link className="public-text-link" href="/privacy">كيف تُستخدم بياناتك؟ <ArrowUpLeft size={18} aria-hidden="true" /></Link></div><FaqList /></section>
      <section className="public-container public-final-cta"><p className="public-eyebrow">ابدأ بما تريد قوله</p><h2>بعض الكلمات تستحق أن تُكتب.</h2><p>ادخل بحساب Google، واكتب رسالتك الأولى.</p><Link href="/login" className="public-button">ابدأ رسالتك <ArrowUpLeft size={20} aria-hidden="true" /></Link></section>
    </main>
  </PublicShell>
}
