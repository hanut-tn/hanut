import Image from 'next/image'

type Props = {
  shopName: string
  logoUrl: string | null
  closedMessage: string | null
  closedUntil: string | null
}

// Écran affiché à la place du catalogue quand le vendeur a mis sa boutique
// en pause (sellers.is_open = false) — voir /s/[slug]/page.tsx.
export default function BoutiqueAbsencePage({ shopName, logoUrl, closedMessage, closedUntil }: Props) {
  const message = closedMessage || 'La boutique est temporairement fermée.'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white">
      <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-3xl font-bold text-white mb-6 bg-brand-600">
        {logoUrl ? (
          <Image src={logoUrl} alt="" width={80} height={80} className="w-full h-full object-cover" />
        ) : (
          shopName.charAt(0).toUpperCase()
        )}
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{shopName}</h1>

      <div className="text-4xl mb-4" aria-hidden>🌙</div>
      <p className="text-gray-600 text-lg max-w-sm leading-relaxed mb-4">{message}</p>

      {closedUntil && (
        <p className="text-sm text-gray-400">
          Réouverture prévue le{' '}
          {new Date(closedUntil).toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}

      <div className="mt-12">
        <a href="https://www.hanut.tn" className="text-xs text-gray-300">
          Propulsé par Hanut
        </a>
      </div>
    </div>
  )
}
