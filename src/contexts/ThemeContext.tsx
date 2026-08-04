import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

type Theme = 'light' | 'dark'
type ColorScheme = 'forest' | 'violet' | 'terracotta'

const THEME_STORAGE_KEY = 'tidyledger-theme'
const COLOR_SCHEME_STORAGE_KEY = 'tidyledger-color-scheme'

type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialColorScheme(): ColorScheme {
  if (typeof window === 'undefined') return 'forest'
  const stored = window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)
  if (stored === 'forest' || stored === 'violet' || stored === 'terracotta') return stored
  return 'forest'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { business, loading, refreshProfile } = useAuth()
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(getInitialColorScheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.dataset.colorScheme = colorScheme
    root.style.colorScheme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, colorScheme)
  }, [theme, colorScheme])

  useEffect(() => {
    if (loading || !business?.id) return

    const nextTheme = business.dashboard_theme_mode === 'dark' ? 'dark' : 'light'
    const nextColorScheme = business.dashboard_color_scheme === 'violet' || business.dashboard_color_scheme === 'terracotta'
      ? business.dashboard_color_scheme
      : 'forest'

    setThemeState(nextTheme)
    setColorSchemeState(nextColorScheme)
  }, [loading, business?.id, business?.dashboard_theme_mode, business?.dashboard_color_scheme])

  // Follow the OS setting until the person picks a theme explicitly.
  useEffect(() => {
    if (window.localStorage.getItem(THEME_STORAGE_KEY)) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setThemeState(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  async function persistThemeSelection(nextTheme: Theme, nextColorScheme: ColorScheme) {
    if (!business?.id) return

    const { error } = await supabase
      .from('businesses')
      .update({
        dashboard_theme_mode: nextTheme,
        dashboard_color_scheme: nextColorScheme,
      })
      .eq('id', business.id)

    if (!error) {
      await refreshProfile()
    }
  }

  function setTheme(next: Theme) {
    setThemeState(next)
    persistThemeSelection(next, colorScheme)
  }

  function setColorScheme(next: ColorScheme) {
    setColorSchemeState(next)
    persistThemeSelection(theme, next)
  }

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setThemeState(nextTheme)
    persistThemeSelection(nextTheme, colorScheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, colorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
