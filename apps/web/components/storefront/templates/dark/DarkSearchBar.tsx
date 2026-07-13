'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import type { TemplateSearchBarProps } from '../types'

// Identité Dark : fond quasi noir, bordure discrète, glow primary au focus.
export default function DarkSearchBar({ value, onChange, t }: TemplateSearchBarProps) {
  const [draft, setDraft] = useState(value)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => onChange(draft), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  return (
    <div className="px-4 pt-3">
      <div
        style={{
          backgroundColor: '#111111',
          border: isFocused ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: isFocused ? '0 0 12px color-mix(in srgb, var(--primary) 35%, transparent)' : 'none',
        }}
        className="flex items-center gap-2.5 px-3.5 py-3 transition-all"
      >
        <Search className="w-4 h-4 shrink-0 text-white/50" strokeWidth={1.5} />
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={t.search.placeholder.toUpperCase()}
          aria-label={t.search.placeholder}
          className="flex-1 min-w-0 min-h-[22px] touch-manipulation bg-transparent outline-none text-sm text-white placeholder:text-white/30 uppercase tracking-wide"
        />
      </div>
    </div>
  )
}
