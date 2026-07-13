import Image from 'next/image'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { HANUT_CONTACT } from '@/lib/constants'

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
    title: 'Transporteurs',
    links: [
      { label: 'Voir tous les transporteurs', href: '/carriers' },
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
      { label: 'CGU', href: '/legal' },
      { label: 'Confidentialité', href: '/privacy' },
    ],
  },
]

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="bg-[#1C1917] text-neutral-400 pt-16 pb-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center mb-4">
              <Image src="/logo-horizontal-blanc.svg" alt="Hanut" width={96} height={32} unoptimized />
            </Link>
            <p className="text-sm leading-relaxed text-neutral-400">
              L&apos;outil de gestion pour vendeurs tunisiens
            </p>
          </div>

          {COLS.map(col => (
            <div key={col.title}>
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map(l => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-neutral-400 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
                {col.title === 'Ressources' && (
                  <li>
                    <a
                      href={`mailto:${HANUT_CONTACT.email}`}
                      className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      {HANUT_CONTACT.email}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-400">
            © 2026 Hanut. Tous droits réservés. Fait en Tunisie.
          </p>
          <div className="flex items-center gap-5">
            <a
              href="https://instagram.com/hanut.tn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hanut sur Instagram"
              title="Hanut sur Instagram"
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Instagram
            </a>
            <a
              href="https://facebook.com/hanut.tn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hanut sur Facebook"
              title="Hanut sur Facebook"
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Facebook
            </a>
            <a
              href="https://tiktok.com/@hanut.tn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hanut sur TikTok"
              title="Hanut sur TikTok"
              className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <TikTokIcon className="w-3.5 h-3.5 shrink-0" />
              TikTok
            </a>
            <a
              href="https://linkedin.com/company/hanut"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hanut sur LinkedIn"
              title="Hanut sur LinkedIn"
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
