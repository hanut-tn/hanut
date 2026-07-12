'use client'

import { COLOR_PRESETS, type StorefrontTextStyle } from '@hanut/types'
import TextStyleFields from './TextStyleFields'

type Props = {
  productPrice: StorefrontTextStyle
  onChange: (patch: Partial<StorefrontTextStyle>) => void
}

export default function ProductPriceSection({ productPrice, onChange }: Props) {
  return <TextStyleFields value={productPrice} presets={COLOR_PRESETS.primary} onChange={onChange} />
}
