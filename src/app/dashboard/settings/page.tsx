// src/app/dashboard/settings/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import { Crown, Check } from 'lucide-react'

const plans = [
  {
    key: 'FREE', name: 'مجاني', price: '$0', period: '',
    features: ['رسالة واحدة', 'بريد إلكتروني فقط', 'شاهد واحد', 'Dead Man\'s Switch أساسي'],
  },
  {
    key: 'BASIC', name: 'أساسي', price: '$29', period: '/سنة',
    features: ['5 رسائل', 'بريد + واتساب + SMS', 'شاهدان موثوقان', 'مناسبات مستقبلية', 'حفظ في Drive'],
    recommended: true,
  },
  {
    key: 'PREMIUM', name: 'بريميوم', price: '$79', period: '/سنة',
    features: ['رسائل غير محدودة', 'فيديو وصوت', '5 شهود موثوقون', 'أرشفة دائمة', 'دعم أولوية'],
  },
]

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)!
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { name: true, email: true, image: true, plan: true, createdAt: true },
  })

  return (
    <div className="animate-fade-in max-w-2xl space-y-8" dir="rtl">
      <div>
        <p className="section-label">الإعدادات</p>
        <h1 className="page-title">حسابي</h1>
      </div>

      {/* Profile */}
      <div className="card flex items-center gap-5">
        {user?.image && (
          <Image src={user.image} alt="" width={64} height={64}
            className="rounded-full border-2 border-[rgba(184,134,11,0.3)] flex-shrink-0" />
        )}
        <div>
          <h2 className="text-[#1A1208] font-semibold text-lg">{user?.name}</h2>
          <p className="text-[#7A6A52] text-sm" dir="ltr">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="badge badge-gold flex items-center gap-1">
              <Crown size={10} />
              {user?.plan === 'FREE' ? 'مجاني' : user?.plan === 'BASIC' ? 'أساسي' : 'بريميوم'}
            </span>
            <span className="text-[#7A6A52] text-xs">
              · عضو منذ {new Date(user?.createdAt || '').getFullYear()}
            </span>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="font-semibold text-[#1A1208] mb-4">خطط الاشتراك</h2>
        <div className="grid grid-cols-3 gap-3">
          {plans.map(plan => {
            const isCurrent = user?.plan === plan.key
            return (
              <div key={plan.key}
                className={`rounded-xl border p-4 relative transition-all ${
                  isCurrent
                    ? 'border-[#D4A017] bg-[#FAF3E0]'
                    : plan.recommended
                    ? 'border-[rgba(184,134,11,0.4)] bg-[#F5EDD8]'
                    : 'border-[rgba(184,134,11,0.2)] bg-[#FDF8F0]'
                }`}>
                {plan.recommended && !isCurrent && (
                  <div className="absolute -top-2.5 right-1/2 translate-x-1/2 bg-[#D4A017] text-[#1A1208] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    الأشهر
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-2.5 right-1/2 translate-x-1/2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    خطتك الحالية
                  </div>
                )}
                <div className="text-xs text-[#7A6A52] mb-1">{plan.name}</div>
                <div className="text-xl font-bold text-[#1A1208]">
                  {plan.price}<span className="text-xs font-normal text-[#7A6A52]">{plan.period}</span>
                </div>
                <ul className="mt-3 space-y-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-[#7A6A52]">
                      <Check size={10} className="text-[#B8860B] mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <button className="mt-4 w-full text-xs py-2 rounded-lg border border-[rgba(184,134,11,0.3)] text-[#B8860B] hover:bg-[#FAF3E0] transition-colors">
                    {plan.key === 'FREE' ? 'الخطة الحالية' : 'الترقية'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-[#7A6A52] text-xs text-center mt-3">
          للترقية، تواصل معنا على support@wasiyati.com · الدفع قريباً عبر Stripe
        </p>
      </div>

      {/* Danger zone */}
      <div className="card border-red-200 bg-red-50 space-y-3">
        <h3 className="text-red-800 font-semibold text-sm">منطقة الخطر</h3>
        <p className="text-red-600 text-xs">حذف الحساب سيؤدي إلى حذف جميع رسائلك نهائياً ولا يمكن التراجع.</p>
        <button className="text-red-600 text-sm border border-red-300 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors">
          حذف الحساب نهائياً
        </button>
      </div>
    </div>
  )
}
