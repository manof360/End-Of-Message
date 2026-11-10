import Link from 'next/link'
import { ArrowUpLeft, Heart, Menu } from 'lucide-react'
import type { ReactNode, ReactElement } from 'react'
import { ThemeToggle } from './ThemeToggle'

const navLinks = [['/features', 'المميزات'], ['/#how-it-works', 'كيف يعمل؟'], ['/about', 'عن وصيتي'], ['/faq', 'الأسئلة الشائعة']] as const

export function PublicShell({ children }: { children: ReactNode }): ReactElement {
  return <div className="public-site">
    <a className="public-skip" href="#main-content">انتقل إلى المحتوى</a>
    <header className="public-header"><div className="public-container public-header-inner">
      <Link href="/" className="public-brand" aria-label="وصيتي، الصفحة الرئيسية"><span className="public-brand-mark"><Heart size={22} aria-hidden="true" /></span><span>وصيتي<small lang="en">WASIYATI</small></span></Link>
      <nav className="public-desktop-nav" aria-label="القائمة الرئيسية">{navLinks.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav>
      <div className="public-header-actions"><ThemeToggle /><Link className="public-button public-button-small" href="/login">تسجيل الدخول <ArrowUpLeft size={16} aria-hidden="true" /></Link><details className="public-mobile-menu"><summary aria-label="فتح قائمة التنقل"><Menu size={23} aria-hidden="true" /></summary><nav aria-label="قائمة الجوال">{navLinks.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav></details></div>
    </div></header>
    {children}
    <footer className="public-footer"><div className="public-container">
      <div className="public-footer-top"><div><Link href="/" className="public-footer-brand">وصيتي<span lang="en"> / Wasiyati</span></Link><p>كلماتك اليوم، لمن يهمك أمرهم.</p></div><Link className="public-text-link" href="/login">ابدأ كتابة رسالتك <ArrowUpLeft size={18} aria-hidden="true" /></Link></div>
      <nav className="public-footer-links" aria-label="روابط المعلومات والسياسات"><Link href="/about">عن وصيتي</Link><Link href="/features">المميزات</Link><Link href="/faq">الأسئلة الشائعة</Link><Link href="/privacy">الخصوصية</Link><Link href="/security">معلومات الأمان</Link><Link href="/terms">مسودة الشروط</Link><Link href="/contact">التواصل</Link></nav>
      <div className="public-footer-bottom"><span>© {new Date().getFullYear()} وصيتي</span><span>خدمة للرسائل الشخصية. لا تُعد توثيقاً لوصية قانونية.</span></div>
    </div></footer>
  </div>
}

export function InfoPage({ label, title, description, children }: { label: string; title: string; description: string; children: ReactNode }): ReactElement {
  return <PublicShell><main id="main-content" tabIndex={-1}>
    <div className="public-page-heading public-container"><Link href="/" className="public-back">الرئيسية / {label}</Link><p className="public-eyebrow">{label}</p><h1>{title}</h1><p className="public-lead">{description}</p></div>
    <div className="public-container public-info-content">{children}</div>
  </main></PublicShell>
}
