'use client'
// src/components/layout/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import {
  LayoutDashboard, FileText, Users, Settings,
  LogOut, Shield, Bell, HardDrive
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/dashboard/messages', label: 'رسائلي', icon: FileText },
  { href: '/dashboard/keyholders', label: 'الشهود الموثوقون', icon: Users },
  { href: '/dashboard/drive', label: 'Google Drive', icon: HardDrive },
  { href: '/dashboard/switch', label: 'إعدادات المفتاح', icon: Bell },
  { href: '/dashboard/settings', label: 'الإعدادات', icon: Settings },
]

const adminItems = [
  { href: '/admin', label: 'لوحة الأدمن', icon: Shield },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <aside className="w-64 min-h-screen bg-[#1A1208] flex flex-col border-l border-[rgba(184,134,11,0.15)]">
      {/* Logo */}
      <div className="p-6 border-b border-[rgba(184,134,11,0.15)]">
        <Link href="/dashboard">
          <h1 className="text-2xl font-bold text-[#FDF8F0]">
            وصي<span className="text-[#D4A017]">تي</span>
          </h1>
          <p className="text-[rgba(253,248,240,0.4)] text-xs mt-1">رسائلك تعيش بعدك</p>
        </Link>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-[rgba(184,134,11,0.1)]">
        <div className="flex items-center gap-3">
          {session?.user?.image && (
            <Image
              src={session.user.image}
              alt={session.user.name || ''}
              width={36}
              height={36}
              className="rounded-full border border-[rgba(184,134,11,0.3)]"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[#FDF8F0] text-sm font-medium truncate">
              {session?.user?.name}
            </p>
            <p className="text-[rgba(253,248,240,0.4)] text-xs truncate">
              {session?.user?.plan === 'FREE' ? 'مجاني' :
               session?.user?.plan === 'BASIC' ? 'أساسي' : 'بريميوم'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                active
                  ? 'bg-[#D4A017] text-[#1A1208] font-medium'
                  : 'text-[rgba(253,248,240,0.65)] hover:bg-[rgba(184,134,11,0.1)] hover:text-[#FDF8F0]'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-4">
              <p className="text-[rgba(253,248,240,0.25)] text-xs uppercase tracking-widest">
                الإدارة
              </p>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                    active
                      ? 'bg-[#D4A017] text-[#1A1208] font-medium'
                      : 'text-[rgba(253,248,240,0.65)] hover:bg-[rgba(184,134,11,0.1)] hover:text-[#FDF8F0]'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-[rgba(184,134,11,0.15)]">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[rgba(253,248,240,0.5)] hover:bg-[rgba(239,68,68,0.1)] hover:text-red-400 transition-all"
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}
