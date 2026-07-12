'use client'

import { COLOR_PRESETS, type StorefrontColors } from '@hanut/types'
import ColorField from './ColorField'

type Props = {
  colors: StorefrontColors
  onChange: (patch: Partial<StorefrontColors>) => void
}

export default function ColorsSection({ colors, onChange }: Props) {
  return (
    <div className="space-y-5">
      <ColorField
        label="Couleur principale"
        value={colors.primary}
        presets={COLOR_PRESETS.primary}
        onChange={hex => onChange({ primary: hex })}
      />
      <ColorField
        label="Fond de la page"
        value={colors.pageBg}
        presets={COLOR_PRESETS.pageBg}
        onChange={hex => onChange({ pageBg: hex })}
      />
      <ColorField
        label="Fond des cartes"
        value={colors.cardBg}
        presets={COLOR_PRESETS.cardBg}
        onChange={hex => onChange({ cardBg: hex })}
      />
      <ColorField
        label="Couleur du texte principal"
        value={colors.textPrimary}
        presets={COLOR_PRESETS.text}
        onChange={hex => onChange({ textPrimary: hex })}
      />
      <ColorField
        label="Couleur du texte secondaire"
        value={colors.textSecondary}
        presets={COLOR_PRESETS.text}
        onChange={hex => onChange({ textSecondary: hex })}
      />
    </div>
  )
}
