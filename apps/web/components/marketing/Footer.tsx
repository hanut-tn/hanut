import Link from 'next/link'

const COLS = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités', href: '/features' },
      { label: 'Roadmap', href: '/roadmap' },
      { label: 'Tarifs', href: '/pricing' },
      { label: 'App mobile', href: '/mobile' },
    ],
  },
  {
    title: 'Livreurs',
    links: [
      { label: 'Voir tous les livreurs', href: '/carriers' },
      { label: 'IntiGo', href: '/carriers' },
      { label: 'Navex', href: '/carriers' },
      { label: 'Aramex', href: '/carriers' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'À propos', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { label: 'CGU', href: '#' },
      { label: 'Confidentialité', href: '#' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-[#1C1917] text-gray-400 pt-16 pb-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#16A34A] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="font-bold text-white text-lg">Hanut</span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-500">
              L&apos;outil de gestion pour vendeurs tunisiens
            </p>
          </div>

          {COLS.map(col => (
            <div key={col.title}>
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map(l => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-gray-500 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            © 2026 Hanut. Tous droits réservés. Fait en Tunisie.
          </p>
          <div className="flex items-center gap-5">
            <a
              href="https://instagram.com/hanut.tn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hanut sur Instagram"
              title="Hanut sur Instagram"
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              Instagram
            </a>
            <a
              href="https://facebook.com/hanut.tn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hanut sur Facebook"
              title="Hanut sur Facebook"
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              Facebook
            </a>
            <a
              href="https://linkedin.com/company/hanut"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hanut sur LinkedIn"
              title="Hanut sur LinkedIn"
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
