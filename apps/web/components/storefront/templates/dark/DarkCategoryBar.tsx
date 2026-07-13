'use client'

import type { TemplateCategoryBarProps } from '../types'

// Identité Dark : même noir que le header (continuité visuelle), slash
// devant chaque catégorie, actif = primary avec glow.
export default function DarkCategoryBar({ categories, selected, onSelect, t }: TemplateCategoryBarProps) {
  function renderTab(id: string, label: string) {
    const isActive = selected === id
    return (
      <button
        key={id}
        type="button"
        onClick={() => onSelect(id)}
        style={{
          color: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
          textShadow: isActive ? '0 0 10px color-mix(in srgb, var(--primary) 60%, transparent)' : 'none',
        }}
        className="shrink-0 min-h-[36px] touch-manipulation text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-colors"
      >
        /{label}
      </button>
    )
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="max-w-5xl mx-auto overflow-x-auto scrollbar-none">
        <div className="flex gap-4 px-4 py-2.5 w-max min-w-full">
          {renderTab('all', t.shop.categoryAll)}
          {categories.map(c => renderTab(c.id, c.name))}
        </div>
      </div>
    </div>
  )
}
