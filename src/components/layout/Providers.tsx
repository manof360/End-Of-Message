'use client'
// src/components/layout/Providers.tsx
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
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
    </SessionProvider>
  )
}
