'use client'

import {
  CARD_RADIUS_VALUES, CARD_SHADOW_VALUES, IMAGE_RATIO_VALUES,
  type StorefrontCardRadius, type StorefrontCardShadow, type StorefrontImageRatio, type StorefrontCards,
} from '@hanut/types'
import DimensionField from '../ui/DimensionField'

type Props = {
  cards: StorefrontCards
  onChange: (patch: Partial<StorefrontCards>) => void
}

const RADIUS_KEYS = Object.keys(CARD_RADIUS_VALUES) as StorefrontCardRadius[]
const SHADOW_KEYS = Object.keys(CARD_SHADOW_VALUES) as StorefrontCardShadow[]
const RATIO_KEYS = Object.keys(IMAGE_RATIO_VALUES) as StorefrontImageRatio[]

function OptionButton({ selected, onClick, children, label }: { selected: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition-colors ${
        selected ? 'border-[#16A34A] bg-[#F0FDF4]' : 'border-[#E7E5E4] hover:border-gray-300'
      }`}
    >
      {children}
      <span className={`text-xs font-medium ${selected ? 'text-[#166534]' : 'text-[#78716C]'}`}>{label}</span>
    </button>
  )
}

export default function CardsSection({ cards, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Coins</label>
        <div className="flex gap-2">
          {RADIUS_KEYS.map(key => (
            <OptionButton key={key} selected={cards.radius === key} onClick={() => onChange({ radius: key })} label={CARD_RADIUS_VALUES[key].label}>
              <div className="w-8 h-8 bg-gray-300" style={{ borderRadius: CARD_RADIUS_VALUES[key].css }} />
            </OptionButton>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Ombre</label>
        <div className="flex gap-2">
          {SHADOW_KEYS.map(key => (
            <OptionButton key={key} selected={cards.shadow === key} onClick={() => onChange({ shadow: key })} label={CARD_SHADOW_VALUES[key].label}>
              <div className="w-8 h-8 rounded-md bg-white" style={{ boxShadow: CARD_SHADOW_VALUES[key].css }} />
            </OptionButton>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Format des images</label>
        <div className="flex gap-2">
          {RATIO_KEYS.map(key => (
            <OptionButton key={key} selected={cards.imageRatio === key} onClick={() => onChange({ imageRatio: key })} label={IMAGE_RATIO_VALUES[key].label}>
              <div className="w-8 h-8 flex items-center justify-center">
                <div className="bg-gray-300 rounded-sm max-w-full max-h-full" style={{ aspectRatio: IMAGE_RATIO_VALUES[key].css, width: key === 'portrait' ? '75%' : '100%', height: key === 'landscape' ? '75%' : '100%' }} />
              </div>
            </OptionButton>
          ))}
        </div>
      </div>

      <DimensionField
        label="Hauteur image"
        value={cards.imageHeight}
        min={100}
        max={400}
        step={10}
        inputType="slider"
        onChange={imageHeight => onChange({ imageHeight })}
      />
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
        label="Padding intérieur"
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
