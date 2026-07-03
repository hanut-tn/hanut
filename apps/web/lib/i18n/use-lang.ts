'use client'

import { useCallback, useState } from 'react'

export type Lang = 'fr' | 'ar'

export function useLang<T>(translations: Record<Lang, T>, defaultLang: Lang = 'fr') {
  const [lang, setLang] = useState<Lang>(defaultLang)

  const toggleLang = useCallback(() => {
    setLang(prev => (prev === 'fr' ? 'ar' : 'fr'))
  }, [])

  return {
    lang,
    t: translations[lang],
    isRtl: lang === 'ar',
    toggleLang,
  }
}
