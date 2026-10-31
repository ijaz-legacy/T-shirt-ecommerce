import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Lang } from '../lib/types'

interface LangCtx {
  lang: Lang
  toggle: () => void
}

const Ctx = createContext<LangCtx | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('ijaz_lang')
    return stored === 'ta' ? 'ta' : 'en'
  })

  function toggle() {
    const next: Lang = lang === 'en' ? 'ta' : 'en'
    setLang(next)
    localStorage.setItem('ijaz_lang', next)
  }

  return <Ctx.Provider value={{ lang, toggle }}>{children}</Ctx.Provider>
}

export function useLang() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLang must be used inside LangProvider')
  return ctx
}
