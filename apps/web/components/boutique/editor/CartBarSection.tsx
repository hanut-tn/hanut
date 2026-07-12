'use client'

import { COLOR_PRESETS, type StorefrontCartBar } from '@hanut/types'
import ColorField from './ColorField'

type Props = {
  cartBar: StorefrontCartBar
  onChange: (patch: Partial<StorefrontCartBar>) => void
}

export default function CartBarSection({ cartBar, onChange }: Props) {
  return (
    <div className="space-y-5">
      <ColorField
        label="Couleur de fond"
        value={cartBar.bg}
        presets={COLOR_PRESETS.primary}
        onChange={hex => onChange({ bg: hex })}
      />
      <ColorField
        label="Couleur du texte"
        value={cartBar.textColor}
        presets={COLOR_PRESETS.text}
        onChange={hex => onChange({ textColor: hex })}
      />
      <ColorField
        label="Bouton — fond"
        value={cartBar.buttonBg}
        presets={COLOR_PRESETS.cardBg}
        onChange={hex => onChange({ buttonBg: hex })}
      />
      <ColorField
        label="Bouton — texte"
        value={cartBar.buttonTextColor}
        presets={COLOR_PRESETS.primary}
        onChange={hex => onChange({ buttonTextColor: hex })}
      />
    </div>
  )
}
