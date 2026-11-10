import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata('تسجيل الدخول', 'ادخل بحساب Google إلى لوحة وصيتي لكتابة رسائلك ومتابعة إعدادات الإرسال.', '/login', false)

export default function LoginLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return children
}
