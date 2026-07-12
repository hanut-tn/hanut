'use client'

import type { StorefrontCards } from '@hanut/types'
import DimensionField from '../ui/DimensionField'

type Props = {
  cards: StorefrontCards
  onChange: (patch: Partial<StorefrontCards>) => void
}

/** Raccourci pratique regroupant gap/padding des cartes — les mêmes champs
 * que dans "Cartes produits" (CardsSection), pour un accès direct sans
 * naviguer jusqu'à la section radius/ombre/image. */
export default function SpacingSection({ cards, onChange }: Props) {
  return (
    <div className="space-y-5">
      <DimensionField
        label="Espacement entre cartes"
        value={cards.gap}
        min={4}
        max={32}
        step={2}
        inputType="slider"
        onChange={gap => onChange({ gap })}
      />
      <DimensionField
        label="Padding des cartes"
        value={cards.padding}
        min={4}
        max={32}
        step={2}
        inputType="slider"
        onChange={padding => onChange({ padding })}
      />
    </div>
  )
}
