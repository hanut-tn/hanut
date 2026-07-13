'use client'

import type { TemplateCategoryBarProps } from '../types'

// Identité Mode : tabs avec underline (pas des pills), uppercase, tracking
// large. Le positionnement sticky est géré par StorefrontShell — ce
// composant ne rend que le contenu visuel de la barre.
export default function ModeCategoryBar({ categories, selected, onSelect, t }: TemplateCategoryBarProps) {
  function renderTab(id: string, label: string) {
    const isActive = selected === id
    return (
      <button
        key={id}
        type="button"
        onClick={() => onSelect(id)}
        className={`shrink-0 min-h-[40px] touch-manipulation px-0.5 text-[11px] font-medium uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
          isActive ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto overflow-x-auto scrollbar-none">
        <div className="flex gap-5 px-4 w-max min-w-full">
          {renderTab('all', t.shop.categoryAll)}
          {categories.map(c => renderTab(c.id, c.name))}
        </div>
      </div>
    </div>
  )
}
