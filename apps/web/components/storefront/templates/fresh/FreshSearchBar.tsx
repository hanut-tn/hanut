'use client'

import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { TemplateSearchBarProps } from '../types'

// Identité Fresh : pilule très arrondie, ombre colorée au focus, ton fun.
export default function FreshSearchBar({ value, onChange, t }: TemplateSearchBarProps) {
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
          backgroundColor: 'var(--card-bg, #fff)',
          boxShadow: isFocused
            ? '0 4px 16px color-mix(in srgb, var(--primary) 25%, transparent)'
            : '0 1px 4px color-mix(in srgb, var(--text-primary, #14532d) 6%, transparent)',
        }}
        className="flex items-center gap-2.5 px-4 py-3 rounded-full transition-shadow"
      >
        <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={t.search.placeholder}
          aria-label={t.search.placeholder}
          style={{ color: 'var(--text-primary, #14532d)' }}
          className="flex-1 min-w-0 min-h-[22px] touch-manipulation bg-transparent outline-none text-sm placeholder:opacity-60"
        />
        {draft && (
          <button
            type="button"
            onClick={() => setDraft('')}
            aria-label={t.search.resetButton}
            style={{ backgroundColor: 'var(--primary)' }}
            className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center opacity-70 hover:opacity-100"
          >
            <X className="w-[10px] h-[10px] text-white" strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  )
}
