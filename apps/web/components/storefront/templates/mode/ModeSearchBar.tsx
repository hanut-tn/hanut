'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import type { TemplateSearchBarProps } from '../types'

// Identité Mode : fond gris très léger, sans bordure ni ombre.
export default function ModeSearchBar({ value, onChange, t }: TemplateSearchBarProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => onChange(draft), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  return (
    <div className="px-4 pt-3">
      <div className="flex items-center gap-2.5 bg-[#f5f5f5] px-3.5 py-2.5">
        <Search className="w-4 h-4 shrink-0 text-gray-400" strokeWidth={1.5} />
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={t.search.placeholder}
          aria-label={t.search.placeholder}
          className="flex-1 min-w-0 min-h-[22px] touch-manipulation bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
        />
      </div>
    </div>
  )
}
