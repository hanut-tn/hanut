'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

function LiveClock() {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    const format = () => setTime(new Date().toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' }))
    format()
    const interval = setInterval(format, 1000 * 30)
    return () => clearInterval(interval)
  }, [])

  // Rendu vide côté serveur puis rempli côté client : évite un mismatch
  // d'hydratation lié au fuseau horaire du visiteur.
  return <p className="mb-4 font-mono text-sm text-white/30">{time ?? ' '}</p>
}

export default function FinalCtaSection() {
  return (
    <section className="bg-[#0a0a0a] px-4 py-28 sm:px-6 sm:py-36">
      <div className="mx-auto max-w-2xl text-center">
        <LiveClock />
        <h2 className="font-playfair text-5xl text-white sm:text-6xl">
          Votre boutique<br />
          <span className="italic text-brand-400">vous attend.</span>
        </h2>
        <p className="mt-6 text-lg text-white/50">
          Des vendeurs tunisiens reçoivent leurs premières commandes
          sur Hanut en ce moment même.
        </p>
        <Link
          href="/register"
          className="animate-cta-glow mt-10 inline-flex items-center gap-3 rounded-2xl bg-brand-600 px-10 py-5 text-lg font-semibold text-white transition-all hover:scale-[1.03] hover:bg-brand-500"
        >
          Créer ma boutique maintenant
          <span>→</span>
        </Link>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/30">
          <span>✓ Gratuit 14 jours</span>
          <span>✓ Aucune carte</span>
          <span>✓ Annulation libre</span>
        </div>
      </div>
    </section>
  )
}
