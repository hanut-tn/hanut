'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
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
    <div className="relative">
      <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder={t.search.placeholder}
        aria-label={t.search.placeholder}
        className="w-full min-h-[44px] touch-manipulation rounded-xl border border-gray-200 bg-white ps-11 pe-4 py-2.5 text-sm outline-none transition focus:ring-2"
        style={{ '--tw-ring-color': 'color-mix(in srgb, var(--primary) 20%, transparent)' } as React.CSSProperties}
      />
    </div>
  )
}
