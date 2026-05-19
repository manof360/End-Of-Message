'use client'
// src/components/layout/Providers.tsx
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from 'next-themes'
import { useEffect, useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <SessionProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1A1208',
              color: '#FDF8F0',
              border: '1px solid rgba(184,134,11,0.3)',
              borderRadius: '12px',
              fontFamily: 'var(--font-tajawal)',
              direction: 'rtl',
            },
            success: { iconTheme: { primary: '#D4A017', secondary: '#1A1208' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#FDF8F0' } },
          }}
        />
        {children}
      </SessionProvider>
    )
  }

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="wasiyati-theme">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1A1208',
              color: '#FDF8F0',
              border: '1px solid rgba(184,134,11,0.3)',
              borderRadius: '12px',
              fontFamily: 'var(--font-tajawal)',
              direction: 'rtl',
            },
            success: { iconTheme: { primary: '#D4A017', secondary: '#1A1208' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#FDF8F0' } },
          }}
        />
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}
