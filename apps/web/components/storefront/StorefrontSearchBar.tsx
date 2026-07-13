'use client'

import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { StorefrontDict } from '@/lib/i18n/storefront'

type Props = {
  value: string
  onChange: (query: string) => void
  t: StorefrontDict
}

export default function StorefrontSearchBar({ value, onChange, t }: Props) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => onChange(draft), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  return (
    <div
      style={{
        backgroundColor: 'var(--card-bg, #fff)',
        border: '1.5px solid color-mix(in srgb, var(--text-primary, #111827) 10%, transparent)',
        boxShadow: '0 1px 3px color-mix(in srgb, var(--text-primary, #111827) 5%, transparent)',
      }}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
    >
      <Search className="w-[18px] h-[18px] shrink-0" style={{ color: 'var(--text-secondary, #78716C)' }} />
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder={t.search.placeholder}
        aria-label={t.search.placeholder}
        style={{ color: 'var(--text-primary, #111827)' }}
        className="flex-1 min-w-0 min-h-[24px] touch-manipulation bg-transparent outline-none text-sm"
      />
      {draft && (
        <button
          type="button"
          onClick={() => setDraft('')}
          aria-label={t.search.resetButton}
          style={{ backgroundColor: 'var(--text-secondary, #78716C)' }}
          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center opacity-50 hover:opacity-70 transition-opacity"
        >
          <X className="w-[10px] h-[10px] text-white" strokeWidth={3} />
        </button>
      )}
    </div>
  )
}
