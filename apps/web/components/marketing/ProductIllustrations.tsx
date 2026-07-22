// Illustrations produit réutilisables pour les mockups marketing (Hero,
// démo live des templates). Ligne claire, reconnaissables (parfum, hijab,
// sac, sneakers) — pensées pour remplacer des placeholders géométriques
// abstraits. Chaque icône est un <svg> autonome (viewBox 0 0 100 100),
// utilisable directement en DOM (LiveDemoSection) ou imbriqué dans le grand
// SVG du mockup Hero via <svg x=".." y=".." width=".." height=".."> — les
// éléments <svg> imbriqués sont valides en SVG.
type IllustrationProps = {
  color?: string
  className?: string
}

export function PerfumeIllustration({ color = '#78716C', className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <rect x="37" y="18" width="26" height="9" rx="3" fill={color} fillOpacity="0.35" />
      <rect x="40" y="25" width="20" height="12" rx="4" fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.4" strokeWidth="1.5" />
      <rect x="28" y="35" width="44" height="52" rx="9" fill={color} fillOpacity="0.12" stroke={color} strokeOpacity="0.45" strokeWidth="1.5" />
      <rect x="35" y="48" width="30" height="24" rx="4" fill={color} fillOpacity="0.08" stroke={color} strokeOpacity="0.3" strokeWidth="1" />
      <line x1="42" y1="56" x2="58" y2="56" stroke={color} strokeOpacity="0.35" strokeWidth="1" />
      <line x1="42" y1="61" x2="54" y2="61" stroke={color} strokeOpacity="0.25" strokeWidth="1" />
    </svg>
  )
}

export function HijabIllustration({ color = '#78716C', className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <path
        d="M22 32 Q50 12 78 32 Q88 52 68 82 Q50 95 32 82 Q12 52 22 32Z"
        fill={color}
        fillOpacity="0.12"
        stroke={color}
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />
      <path
        d="M32 37 Q50 24 68 37 Q72 55 54 74"
        fill="none"
        stroke={color}
        strokeOpacity="0.3"
        strokeWidth="1.25"
      />
      <path
        d="M40 40 Q50 33 60 40"
        fill="none"
        stroke={color}
        strokeOpacity="0.35"
        strokeWidth="1.25"
      />
    </svg>
  )
}

export function BagIllustration({ color = '#78716C', className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <path
        d="M33 40 Q33 23 50 23 Q67 23 67 40"
        fill="none"
        stroke={color}
        strokeOpacity="0.45"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="20" y="40" width="60" height="48" rx="9" fill={color} fillOpacity="0.12" stroke={color} strokeOpacity="0.45" strokeWidth="1.5" />
      <rect x="41" y="38" width="18" height="7" rx="3.5" fill={color} fillOpacity="0.4" />
      <line x1="20" y1="60" x2="80" y2="60" stroke={color} strokeOpacity="0.2" strokeWidth="1" />
    </svg>
  )
}

export function SneakerIllustration({ color = '#78716C', className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <ellipse cx="50" cy="80" rx="34" ry="7" fill={color} fillOpacity="0.15" />
      <path
        d="M16 76 Q18 44 34 36 Q50 29 66 36 Q80 43 84 60 L84 76 Z"
        fill={color}
        fillOpacity="0.12"
        stroke={color}
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />
      <path d="M37 37 Q50 28 51 44" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="1.25" />
      <line x1="39" y1="49" x2="61" y2="44" stroke={color} strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="39" y1="57" x2="63" y2="52" stroke={color} strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="39" y1="65" x2="65" y2="60" stroke={color} strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export const DEMO_PRODUCT_ILLUSTRATIONS = [
  PerfumeIllustration,
  HijabIllustration,
  BagIllustration,
  SneakerIllustration,
] as const
