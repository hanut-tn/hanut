import { STOREFRONT_THEMES, type StorefrontTheme } from '@hanut/types'

const RADIUS_PX: Record<string, number> = {
  'rounded-lg': 4,
  'rounded-xl': 6,
  'rounded-2xl': 8,
  'rounded-3xl': 10,
}

type Props = {
  themeKey: StorefrontTheme
  primaryColor: string
}

/** Miniature 120×80 : mood du thème (fond, cartes, police) + couleur d'accent en direct. */
export default function ThemePreviewSvg({ themeKey, primaryColor }: Props) {
  const theme = STOREFRONT_THEMES[themeKey]
  const radius = RADIUS_PX[theme.cardRadius] ?? 6
  const cardW = 24
  const cardH = 20
  const gap = 4
  const startX = 8

  return (
    <svg viewBox="0 0 120 80" width="100%" height="80" role="img" aria-label={theme.label}>
      <rect x={0} y={0} width={120} height={80} fill={theme.previewBg} />
      <rect x={0} y={0} width={120} height={16} fill={primaryColor} />
      <circle cx={10} cy={8} r={4} fill="#ffffff" fillOpacity={0.85} />
      <rect x={18} y={6} width={28} height={4} rx={2} fill="#ffffff" fillOpacity={0.85} />
      {[0, 1, 2, 3].map(i => {
        const x = startX + i * (cardW + gap)
        return (
          <g key={i}>
            <rect x={x} y={26} width={cardW} height={cardH} rx={radius} fill={theme.previewCard} stroke={theme.previewBg === theme.previewCard ? '#e5e7eb' : 'transparent'} />
            <rect x={x + 3} y={48} width={cardW - 10} height={3} rx={1.5} fill={theme.previewText} fillOpacity={0.6} />
            <rect x={x + 3} y={53} width={8} height={3} rx={1.5} fill={primaryColor} />
          </g>
        )
      })}
    </svg>
  )
}
