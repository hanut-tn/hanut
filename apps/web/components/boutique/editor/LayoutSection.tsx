'use client'

import { Grid2x2, Grid3x3, List } from 'lucide-react'
import { LAYOUT_LABELS, type StorefrontLayout } from '@hanut/types'

type Props = {
  layout: StorefrontLayout
  onChange: (layout: StorefrontLayout) => void
}

const LAYOUT_OPTIONS: { key: StorefrontLayout; icon: React.ElementType }[] = [
  { key: 'grid-2', icon: Grid2x2 },
  { key: 'grid-3', icon: Grid3x3 },
  { key: 'list', icon: List },
]

export default function LayoutSection({ layout, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {LAYOUT_OPTIONS.map(({ key, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex-1 flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${
            layout === key ? 'border-[#16A34A] bg-[#F0FDF4]' : 'border-[#E7E5E4] hover:border-gray-300'
          }`}
        >
          <Icon className="w-5 h-5" style={{ color: layout === key ? '#166534' : '#78716C' }} />
          <span className={`text-xs font-medium ${layout === key ? 'text-[#166534]' : 'text-[#78716C]'}`}>
            {LAYOUT_LABELS[key]}
          </span>
        </button>
      ))}
    </div>
  )
}
