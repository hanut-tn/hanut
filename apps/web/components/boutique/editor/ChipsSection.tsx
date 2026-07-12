'use client'

import { COLOR_PRESETS, type StorefrontChips } from '@hanut/types'
import ColorField from './ColorField'

type Props = {
  chips: StorefrontChips
  onChange: (patch: Partial<StorefrontChips>) => void
}

export default function ChipsSection({ chips, onChange }: Props) {
  return (
    <div className="space-y-5">
      <ColorField
        label="Fond des chips"
        value={chips.bg}
        presets={COLOR_PRESETS.cardBg}
        onChange={hex => onChange({ bg: hex })}
      />
      <ColorField
        label="Texte des chips"
        value={chips.textColor}
        presets={COLOR_PRESETS.text}
        onChange={hex => onChange({ textColor: hex })}
      />
      <ColorField
        label="Chip active — fond"
        value={chips.activeBg}
        presets={COLOR_PRESETS.primary}
        onChange={hex => onChange({ activeBg: hex })}
      />
      <ColorField
        label="Chip active — texte"
        value={chips.activeTextColor}
        presets={COLOR_PRESETS.text}
        onChange={hex => onChange({ activeTextColor: hex })}
      />
    </div>
  )
}
