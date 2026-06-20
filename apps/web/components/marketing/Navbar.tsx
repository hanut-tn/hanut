'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '/features' },
  { label: 'Roadmap', href: '/roadmap' },
  { label: 'Tarifs', href: '/pricing' },
  { label: 'Livreurs', href: '/carriers' },
  { label: 'À propos', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md transition-all duration-200 ${
      scrolled ? 'border-b border-gray-100 shadow-sm' : ''
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center shrink-0">
          <Image src="/logo-horizontal.svg" alt="Hanut" width={110} height={35} priority unoptimized />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
          {NAV_LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`hover:text-[#1C1917] transition-colors ${
                pathname === l.href ? 'text-[#0B5E46] font-semibold' : ''
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-sm font-medium text-gray-600 hover:text-[#1C1917] px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center text-white text-sm font-semibold px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-green-700 transition-colors shadow-sm"
          >
            Commencer
          </Link>
          <button
            className="md:hidden ml-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              {menuOpen ? (
                <path d="M4 4L16 16M16 4L4 16" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
              ) : (
                <>
                  <path d="M3 5H17" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M3 10H17" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M3 15H17" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === l.href
                    ? 'bg-green-50 text-[#0B5E46]'
                    : 'text-gray-600 hover:text-[#1C1917] hover:bg-gray-50'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="px-4 pb-4 flex flex-col gap-2 border-t border-gray-100 pt-3">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              onClick={() => setMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold text-white bg-[#16A34A] rounded-xl hover:bg-green-700 transition-colors"
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
