import { STOREFRONT_TEMPLATES, type StorefrontTemplate } from '@hanut/types'

type Props = {
  template: StorefrontTemplate
  primaryColor: string
}

const CARD_POSITIONS = [
  { x: 4, y: 22 },
  { x: 64, y: 22 },
  { x: 4, y: 52 },
  { x: 64, y: 52 },
]

/** Miniature 120×80 : header + 4 cartes produit simulées, dans l'ambiance du template. */
export default function TemplatePreview({ template, primaryColor }: Props) {
  const tmpl = STOREFRONT_TEMPLATES[template]
  const headerBg = tmpl.headerStyle === 'gradient' ? primaryColor
    : tmpl.headerStyle === 'dark' ? '#000000'
      : '#f5f0e8'
  const cardRadiusPx = Math.min(8, parseFloat(tmpl.cardRadius) * 8)

  return (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full" role="img" aria-label={tmpl.label}>
      <rect width="120" height="80" fill={tmpl.pageBg} />

      {/* Header */}
      <rect width="120" height="18" fill={headerBg} />
      <circle cx="10" cy="9" r="4" fill="rgba(255,255,255,0.4)" />
      <rect x="18" y="6" width="30" height="3" rx="1.5" fill="rgba(255,255,255,0.7)" />
      <rect x="18" y="11" width="20" height="2" rx="1" fill="rgba(255,255,255,0.4)" />
      <rect x="108" y="6" width="7" height="6" rx="1" fill="rgba(255,255,255,0.4)" />

      {/* Cartes produits */}
      {CARD_POSITIONS.map((pos, i) => (
        <g key={i}>
          <rect x={pos.x} y={pos.y} width="52" height="26" rx={cardRadiusPx} fill={tmpl.cardBg} />
          <rect x={pos.x} y={pos.y} width="52" height="14" rx={cardRadiusPx} fill="#e5e7eb" />
          <rect x={pos.x + 3} y={pos.y + 16} width="28" height="2" rx="1" fill={tmpl.textPrimary} opacity="0.7" />
          <rect x={pos.x + 3} y={pos.y + 20} width="16" height="2" rx="1" fill={primaryColor} />
        </g>
      ))}
    </svg>
  )
}
