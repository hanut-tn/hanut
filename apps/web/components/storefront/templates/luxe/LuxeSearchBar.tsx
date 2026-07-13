'use client'

import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { TemplateSearchBarProps } from '../types'

// Identité Luxe : pas de barre visible en permanence — une icône discrète
// centrée ouvre un overlay plein écran crème pour la recherche.
export default function LuxeSearchBar({ value, onChange, t }: TemplateSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => onChange(draft), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  function close() {
    setIsOpen(false)
    setDraft('')
    onChange('')
  }

  return (
    <>
      <div className="flex items-center justify-center py-3">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{ color: 'var(--text-secondary, #6b5e4e)', fontFamily: 'var(--font-family)' }}
          className="flex items-center gap-2 text-xs uppercase tracking-[0.15em]"
        >
          <Search className="w-3.5 h-3.5" strokeWidth={1.25} />
          {t.search.placeholder}
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[90] flex flex-col items-center pt-20 px-6" style={{ backgroundColor: 'var(--page-bg, #faf8f5)' }}>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            style={{ color: 'var(--text-primary, #1a1a1a)' }}
            className="absolute top-4 end-4 w-9 h-9 flex items-center justify-center"
          >
            <X className="w-5 h-5" strokeWidth={1.25} />
          </button>
          <input
            type="text"
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={t.search.placeholder}
            aria-label={t.search.placeholder}
            style={{ color: 'var(--text-primary, #1a1a1a)', fontFamily: 'var(--font-family)', borderColor: 'var(--primary)' }}
            className="w-full max-w-xs text-center text-lg bg-transparent outline-none border-b pb-2"
          />
        </div>
      )}
    </>
  )
}
