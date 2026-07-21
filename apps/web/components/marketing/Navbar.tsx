'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '/#features' },
  { label: 'Roadmap', href: '/roadmap' },
  { label: 'Tarifs', href: '/pricing' },
  { label: 'Transporteurs', href: '/carriers' },
  { label: 'À propos', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === '/'
  // Sur la home, le hero est noir en plein écran : la navbar démarre en
  // variante sombre (logo/liens blancs) puis bascule en clair dès que
  // #hero-sentinel (placé en bas du hero) franchit le haut du viewport.
  // Les autres pages n'ont pas ce sentinel → onDark reste toujours false.
  const [onDark, setOnDark] = useState(isHome)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    if (!isHome) return
    const sentinel = document.getElementById('hero-sentinel')
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => setOnDark(entry.boundingClientRect.top > 0),
      { threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [isHome])

  const dark = onDark && !menuOpen

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md transition-all duration-200 ${
      dark
        ? 'bg-[#0a0a0a]/80'
        : `bg-white/95 ${scrolled ? 'border-b border-neutral-100 shadow-sm' : ''}`
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center shrink-0 overflow-visible">
          <Image
            src={dark ? '/logo-horizontal-blanc.svg' : '/logo-horizontal.svg'}
            alt="Hanut"
            width={100}
            height={32}
            priority
            unoptimized
            className="h-8 w-auto"
          />
        </Link>

        <nav className={`hidden lg:flex items-center gap-8 text-sm font-medium ${dark ? 'text-white/60' : 'text-neutral-500'}`}>
          {NAV_LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`transition-colors ${
                dark ? 'hover:text-white' : 'hover:text-[#1C1917]'
              } ${
                pathname === l.href ? (dark ? 'text-white font-semibold' : 'text-[#0B5E46] font-semibold') : ''
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/login"
            className={`hidden sm:inline-flex items-center min-h-[44px] text-sm font-medium px-4 rounded-lg border border-transparent transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] ${
              dark
                ? 'text-white/80 hover:text-white hover:border-white/20 hover:bg-white/5'
                : 'text-brand-600 hover:text-brand-700 hover:border-brand-600 hover:bg-brand-50'
            }`}
          >
            Se connecter
          </Link>
          <div className="hidden sm:flex flex-col items-center">
            <Link
              href="/register"
              className="inline-flex items-center min-h-[44px] text-white text-sm font-semibold px-5 rounded-xl bg-brand-600 transition-all duration-150 ease-out hover:bg-brand-700 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-brand-600/40 active:scale-[0.97]"
            >
              Créer ma boutique — gratuit
            </Link>
            <p className={`text-[10px] mt-0.5 ${dark ? 'text-white/40' : 'text-gray-400'}`}>14 jours Pro offerts</p>
          </div>
          <button
            className={`lg:hidden ml-1 w-11 h-11 flex items-center justify-center rounded-lg transition-colors ${
              dark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'
            }`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              {menuOpen ? (
                <path d="M4 4L16 16M16 4L4 16" stroke={dark ? '#FFFFFF' : '#374151'} strokeWidth="1.5" strokeLinecap="round"/>
              ) : (
                <>
                  <path d="M3 5H17" stroke={dark ? '#FFFFFF' : '#374151'} strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M3 10H17" stroke={dark ? '#FFFFFF' : '#374151'} strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M3 15H17" stroke={dark ? '#FFFFFF' : '#374151'} strokeWidth="1.5" strokeLinecap="round"/>
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="lg:hidden border-t border-neutral-100 bg-white shadow-lg max-h-[calc(100dvh-4rem)] overflow-y-auto">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === l.href
                    ? 'bg-brand-50 text-[#0B5E46]'
                    : 'text-neutral-600 hover:text-[#1C1917] hover:bg-neutral-50'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="px-4 pb-4 flex flex-col gap-2 border-t border-neutral-100 pt-3">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-medium text-brand-600 border border-brand-600 rounded-lg hover:bg-brand-50 hover:text-brand-700 transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97]"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              onClick={() => setMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-lg transition-all duration-150 ease-out hover:bg-brand-700 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-brand-600/40 active:scale-[0.97]"
            >
              Essayer Pro 14 jours
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
