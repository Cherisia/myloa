'use client'

import { createContext, useContext, useEffect, useState } from 'react'

// theme: 'yellow' | 'pink' | 'dark'
const ThemeContext = createContext({ theme: 'yellow', setTheme: () => {} })

function applyTheme(theme) {
  const html = document.documentElement
  // 기존 상태 초기화
  html.classList.remove('dark')
  html.removeAttribute('data-theme')

  if (theme === 'dark') {
    html.classList.add('dark')
  } else {
    html.setAttribute('data-theme', theme) // 'yellow' | 'pink'
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('yellow')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme') || 'yellow'
    setThemeState(stored)
    applyTheme(stored)
    setMounted(true)
  }, [])

  const setTheme = (next) => {
    setThemeState(next)
    localStorage.setItem('theme', next)
    applyTheme(next)
  }

  if (!mounted) return <div style={{ visibility: 'hidden' }}>{children}</div>

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
