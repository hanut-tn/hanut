'use client'

import type { TemplateCategoryBarProps } from '../types'

// Identité Fresh : pills très arrondies, actif = fond primary + ombre colorée.
export default function FreshCategoryBar({ categories, selected, onSelect, t }: TemplateCategoryBarProps) {
  function renderChip(id: string, label: string, emoji?: string) {
    const isActive = selected === id
    return (
      <button
        key={id}
        type="button"
        onClick={() => onSelect(id)}
        style={isActive ? {
          backgroundColor: 'var(--primary)',
          color: '#fff',
          boxShadow: '0 3px 10px color-mix(in srgb, var(--primary) 45%, transparent)',
        } : {
          backgroundColor: 'color-mix(in srgb, var(--primary) 8%, var(--card-bg, #fff))',
          color: 'var(--text-primary, #14532d)',
        }}
        className="shrink-0 min-h-[36px] touch-manipulation rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5"
      >
        {emoji && <span aria-hidden>{emoji}</span>}
        {label}
      </button>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--page-bg, #f0fdf4)' }}>
      <div className="max-w-5xl mx-auto overflow-x-auto scrollbar-none">
        <div className="flex gap-2 px-4 py-2.5 w-max min-w-full">
          {renderChip('all', t.shop.categoryAll, '🛍️')}
          {categories.map(c => renderChip(c.id, c.name))}
        </div>
      </div>
    </div>
  )
}
