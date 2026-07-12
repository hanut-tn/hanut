'use client'

import { COLOR_PRESETS, type StorefrontSearch } from '@hanut/types'
import ColorField from './ColorField'

type Props = {
  search: StorefrontSearch
  onChange: (patch: Partial<StorefrontSearch>) => void
}

export default function SearchSection({ search, onChange }: Props) {
  return (
    <div className="space-y-5">
      <ColorField
        label="Couleur de fond"
        value={search.bg}
        presets={COLOR_PRESETS.cardBg}
        onChange={hex => onChange({ bg: hex })}
      />
      <ColorField
        label="Couleur de la bordure"
        value={search.borderColor}
        presets={COLOR_PRESETS.text}
        onChange={hex => onChange({ borderColor: hex })}
      />
      <ColorField
        label="Couleur du texte"
        value={search.textColor}
        presets={COLOR_PRESETS.text}
        onChange={hex => onChange({ textColor: hex })}
      />
    </div>
  )
}
