// src/app/dashboard/layout.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col md:flex-row min-h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-[#FDF8F0]">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
