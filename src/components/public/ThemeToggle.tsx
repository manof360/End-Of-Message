'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState, type ReactElement } from 'react'

export function ThemeToggle(): ReactElement {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const isDark = mounted && resolvedTheme === 'dark'
  return <button type="button" className="public-theme-toggle" aria-label="الوضع الليلي" aria-pressed={isDark} disabled={!mounted} onClick={() => setTheme(isDark ? 'light' : 'dark')}>
    {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
  </button>
}
