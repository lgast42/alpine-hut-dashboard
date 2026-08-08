import { createContext, useContext, useState, useCallback } from 'react'
import { translations } from './translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const stored = localStorage.getItem('dashboard-lang')
    return stored === 'de' ? 'de' : 'en'
  })

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'en' ? 'de' : 'en'
      localStorage.setItem('dashboard-lang', next)
      return next
    })
  }, [])

  // Dot-notation lookup with optional {{key}} interpolation.
  // Returns the key path string on lookup failure (never throws).
  const t = useCallback((path, vars = {}) => {
    const keys = path.split('.')
    let node = translations[lang]
    for (const key of keys) {
      if (node == null || typeof node !== 'object') return path
      node = node[key]
    }
    if (typeof node !== 'string') return path
    return Object.entries(vars).reduce(
      (s, [k, v]) => s.replaceAll(`{{${k}}}`, String(v)),
      node
    )
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- provider and hook belong together; fast refresh is a dev nicety
export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}
