'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import type { StorefrontDict } from '@/lib/i18n/storefront'
import type { EditTarget, PopoverPosition } from '@hanut/types'

type Props = {
  value: string
  onChange: (query: string) => void
  t: StorefrontDict
  editMode?: boolean
  onEditTargetChange?: (target: EditTarget, position?: PopoverPosition) => void
}

export default function StorefrontSearchBar({ value, onChange, t, editMode = false, onEditTargetChange }: Props) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => onChange(draft), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  return (
    <div
      data-edit="search"
      onClick={editMode ? (e) => {
        e.stopPropagation()
        const rect = e.currentTarget.getBoundingClientRect()
        onEditTargetChange?.({ type: 'search' }, { top: rect.top, left: rect.left })
      } : undefined}
      className="relative"
    >
      <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--search-text, #9ca3af)', opacity: 0.6 }} />
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        readOnly={editMode}
        placeholder={t.search.placeholder}
        aria-label={t.search.placeholder}
        className="w-full min-h-[44px] touch-manipulation rounded-xl border ps-11 pe-4 py-2.5 outline-none transition focus:ring-2"
        style={{
          backgroundColor: 'var(--search-bg, #f9fafb)',
          borderColor: 'var(--search-border, #e5e7eb)',
          color: 'var(--search-text, #111827)',
          '--tw-ring-color': 'color-mix(in srgb, var(--primary) 20%, transparent)',
          fontSize: 'calc(0.875rem * var(--font-size-scale, 1))',
        } as React.CSSProperties}
      />
    </div>
  )
}
