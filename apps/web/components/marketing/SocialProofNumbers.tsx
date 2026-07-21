'use client'

import { useEffect, useRef, useState } from 'react'

// Chiffres synchronisés avec /about (mêmes sources) — ne pas diverger.
const STATS = [
  { number: '7,5M', label: 'transactions e-commerce par semestre en Tunisie', source: 'BCT 2025' },
  { number: '56%', label: 'des paiements en ligne en Tunisie se font en COD', source: 'GIZ 2024' },
  { number: '0', label: 'plateforme locale qui gère tout ça pour vous', source: "Jusqu'à maintenant" },
]

export default function SocialProofNumbers() {
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-28">
      <div ref={ref} className="mx-auto grid max-w-5xl grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className={`text-center ${inView ? 'animate-reveal' : 'opacity-0'}`}
            style={{ animationDelay: inView ? `${i * 120}ms` : undefined }}
          >
            <p className={`font-playfair text-6xl sm:text-7xl ${stat.number === '0' ? 'text-red-500' : 'text-[#1C1917]'}`}>
              {stat.number}
            </p>
            <p className="mx-auto mt-3 max-w-[14rem] text-sm leading-relaxed text-neutral-500">
              {stat.label}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-neutral-300">
              {stat.source}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
