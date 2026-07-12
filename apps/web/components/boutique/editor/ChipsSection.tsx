'use client'

import { COLOR_PRESETS, type StorefrontChips } from '@hanut/types'
import ColorField from './ColorField'
import DimensionField from '../ui/DimensionField'

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
      <DimensionField
        label="Taille du texte"
        value={chips.fontSize}
        min={10}
        max={20}
        inputType="number"
        onChange={fontSize => onChange({ fontSize })}
      />
      <DimensionField
        label="Espacement horizontal"
        value={chips.paddingX}
        min={8}
        max={24}
        inputType="slider"
        onChange={paddingX => onChange({ paddingX })}
      />
      <DimensionField
        label="Espacement vertical"
        value={chips.paddingY}
        min={2}
        max={12}
        inputType="slider"
        onChange={paddingY => onChange({ paddingY })}
      />
    </div>
  )
}
