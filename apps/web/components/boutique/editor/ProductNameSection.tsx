'use client'

import { COLOR_PRESETS, type StorefrontTextStyle } from '@hanut/types'
import TextStyleFields from './TextStyleFields'

type Props = {
  productName: StorefrontTextStyle
  onChange: (patch: Partial<StorefrontTextStyle>) => void
}

export default function ProductNameSection({ productName, onChange }: Props) {
  return <TextStyleFields value={productName} presets={COLOR_PRESETS.text} onChange={onChange} />
}
