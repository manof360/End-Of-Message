'use client'
// src/components/layout/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import { useState } from 'react'
import {
  LayoutDashboard, FileText, Users, Settings,
  LogOut, Shield, Bell, HardDrive, Menu, X
} from 'lucide-react'

const APP_VERSION = '1.1.0'

const navItems = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/dashboard/messages', label: 'رسائلي', icon: FileText },
  { href: '/dashboard/keyholders', label: 'الشهود الموثوقون', icon: Users },
  { href: '/dashboard/drive', label: 'Google Drive', icon: HardDrive },
  { href: '/dashboard/switch', label: 'إعدادات المفتاح', icon: Bell },
  { href: '/dashboard/settings', label: 'الإعدادات', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const [isOpen, setIsOpen] = useState(false)

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 md:p-6 border-b border-[rgba(184,134,11,0.15)]">
        <Link href="/dashboard" onClick={() => setIsOpen(false)}>
          <h1 className="text-2xl font-bold text-[#FDF8F0]">
            وصي<span className="text-[#D4A017]">تي</span>
          </h1>
          <p className="text-[rgba(253,248,240,0.35)] text-xs mt-0.5">رسائلك تعيش بعدك</p>
        </Link>
      </div>

      {/* User - Hidden on mobile */}
      <div className="hidden md:block p-4 border-b border-[rgba(184,134,11,0.1)]">
        <div className="flex items-center gap-3">
          {session?.user?.image && (
            <Image src={session.user.image} alt={session.user.name || ''}
              width={36} height={36} className="rounded-full border border-[rgba(184,134,11,0.3)]" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[#FDF8F0] text-sm font-medium truncate">{session?.user?.name}</p>
            <p className="text-[rgba(253,248,240,0.4)] text-xs">
              {session?.user?.plan === 'FREE' ? 'مجاني' :
               session?.user?.plan === 'BASIC' ? 'أساسي' : 'بريميوم'}
              {session?.user?.role === 'ADMIN' && ' · أدمن'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 md:p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
          return (
            <Link key={href} href={href} onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl text-sm transition-all duration-200 ${
                active
                  ? 'bg-[#D4A017] text-[#1A1208] font-medium'
                  : 'text-[rgba(253,248,240,0.65)] hover:bg-[rgba(184,134,11,0.1)] hover:text-[#FDF8F0]'
              }`}>
              <Icon size={16} className="flex-shrink-0" /><span className="truncate">{label}</span>
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3 md:px-4">
              <p className="text-[rgba(253,248,240,0.25)] text-xs uppercase tracking-widest">الإدارة</p>
            </div>
            <Link href="/admin" onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl text-sm transition-all ${
                pathname.startsWith('/admin')
                  ? 'bg-[#D4A017] text-[#1A1208] font-medium'
                  : 'text-[rgba(253,248,240,0.65)] hover:bg-[rgba(184,134,11,0.1)] hover:text-[#FDF8F0]'
              }`}>
              <Shield size={16} className="flex-shrink-0" /> لوحة الأدمن
            </Link>
          </>
        )}
      </nav>

      {/* Sign out + version */}
      <div className="border-t border-[rgba(184,134,11,0.15)]">
        <div className="px-3 md:px-4 py-2">
          <button onClick={() => { setIsOpen(false); signOut({ callbackUrl: '/login' }) }}
            className="w-full flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl text-sm text-[rgba(253,248,240,0.5)] hover:bg-[rgba(239,68,68,0.1)] hover:text-red-400 transition-all">
            <LogOut size={16} className="flex-shrink-0" /> تسجيل الخروج
          </button>
        </div>
        <div className="px-4 md:px-6 pb-3 md:pb-4 flex items-center justify-between text-xs">
          <span className="text-[rgba(253,248,240,0.2)]">v{APP_VERSION}</span>
          <span className="text-[rgba(253,248,240,0.15)]">وصيتي</span>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 min-h-screen bg-[#1A1208] flex-col border-l border-[rgba(184,134,11,0.15)]">
        <NavContent />
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-40 bg-[#1A1208] border-b border-[rgba(184,134,11,0.15)]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex-1">
            <h1 className="text-lg font-bold text-[#FDF8F0]">
              وصي<span className="text-[#D4A017]">تي</span>
            </h1>
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-[#FDF8F0] hover:bg-[rgba(184,134,11,0.1)] rounded-lg"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="bg-[#1A1208] border-t border-[rgba(184,134,11,0.15)] max-h-[calc(100vh-60px)] overflow-y-auto">
            <NavContent />
          </div>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 top-[61px] bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
