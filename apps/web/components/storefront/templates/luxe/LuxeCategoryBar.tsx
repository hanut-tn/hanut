'use client'

import type { TemplateCategoryBarProps } from '../types'

// Identité Luxe : centré, uppercase, tracking très large, séparateur "|" entre les catégories.
export default function LuxeCategoryBar({ categories, selected, onSelect, t }: TemplateCategoryBarProps) {
  const all = [{ id: 'all', name: t.shop.categoryAll }, ...categories]

  return (
    <div style={{ backgroundColor: 'var(--page-bg, #faf8f5)' }}>
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex items-center justify-center gap-3 px-6 py-3 w-max min-w-full mx-auto">
          {all.map((c, i) => {
            const isActive = selected === c.id
            return (
              <div key={c.id} className="flex items-center gap-3 shrink-0">
                {i > 0 && <span style={{ color: 'var(--text-secondary, #6b5e4e)' }} className="text-xs opacity-40">|</span>}
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  style={{
                    color: isActive ? 'var(--primary)' : 'var(--text-secondary, #6b5e4e)',
                    fontFamily: 'var(--font-family)',
                    borderBottom: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                  }}
                  className="min-h-[36px] touch-manipulation text-[11px] uppercase tracking-[0.15em] whitespace-nowrap pb-0.5 transition-colors"
                >
                  {c.name}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
