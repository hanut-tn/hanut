'use client'

import { useState } from 'react'

const FEATURES = [
  {
    icon: '🔔',
    title: 'Notifications push',
    desc: 'Soyez alerté à chaque nouvelle commande, même quand vous êtes occupé.',
  },
  {
    icon: '⚡',
    title: 'Gestion commandes',
    desc: 'Confirmez une commande, changez son statut ou créez une expédition en 1 tap.',
  },
  {
    icon: '📦',
    title: 'Catalogue',
    desc: 'Vérifiez votre stock en temps réel et modifiez vos produits depuis votre téléphone.',
  },
  {
    icon: '📊',
    title: 'Dashboard',
    desc: 'Votre CA du jour, commandes en attente et taux de livraison en un coup d\'œil.',
  },
]

export default function MobilePage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMsg(data.message ?? 'Inscrit avec succès !')
        setEmail('')
      } else {
        setStatus('error')
        setMsg(data.error ?? 'Une erreur est survenue')
      }
    } catch {
      setStatus('error')
      setMsg('Erreur réseau. Réessayez.')
    }
  }

  return (
    <div className="bg-[#FAFAF9]">
      {/* Hero */}
      <section className="pt-20 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 text-xs font-bold px-4 py-1.5 rounded-full mb-6 border border-orange-100">
            <span className="w-2 h-2 bg-orange-400 rounded-full" />
            Bientôt disponible
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1C1917] leading-tight tracking-tight mb-5">
            Hanut dans votre poche
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-xl mx-auto mb-10">
            L&apos;app iOS et Android arrive bientôt. Gérez vos commandes, votre stock et vos livraisons depuis votre téléphone.
          </p>

          {/* App store buttons (disabled) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              disabled
              className="flex items-center gap-3 bg-gray-100 border border-gray-200 text-gray-400 px-6 py-3 rounded-xl cursor-not-allowed opacity-60 w-full sm:w-auto"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="text-left">
                <p className="text-xs">Disponible sur</p>
                <p className="font-bold text-sm">App Store</p>
              </div>
            </button>
            <button
              disabled
              className="flex items-center gap-3 bg-gray-100 border border-gray-200 text-gray-400 px-6 py-3 rounded-xl cursor-not-allowed opacity-60 w-full sm:w-auto"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M3.18 23.76c.38.21.8.24 1.22.07l12.33-7.11-2.58-2.58-10.97 9.62zm-1.9-19.95a1.99 1.99 0 0 0-.28 1.03v14.32c0 .38.1.73.28 1.03l.06.06L13.3 8.12v-.27L1.22 3.75l.06.06zm20.44 8.09-3.47-2-3.86 3.86 3.86 3.85 3.48-2.01c.99-.57.99-1.5-.01-2.07v-.03zM4.4.24L16.73 7.35l-2.58 2.58L4.4.24z"/>
              </svg>
              <div className="text-left">
                <p className="text-xs">Disponible sur</p>
                <p className="font-bold text-sm">Google Play</p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Phone mockup + features */}
      <section className="py-16 px-4 sm:px-6 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Phone mockup */}
            <div className="shrink-0">
              <div className="w-56 h-[450px] bg-[#1C1917] rounded-[2.5rem] border-[6px] border-gray-700 shadow-2xl overflow-hidden relative mx-auto">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#1C1917] rounded-b-2xl z-10" />
                <div className="absolute inset-0 bg-[#FAFAF9] pt-8">
                  <div className="px-4 pt-2 pb-3 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-gray-900">Bonjour Yasmine</span>
                      <div className="w-6 h-6 bg-green-50 rounded-full flex items-center justify-center">
                        <span className="text-[#0B5E46] text-[8px] font-bold">H</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-400">Dimanche, 1 juin 2026</p>
                  </div>
                  <div className="px-3 py-3 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "CA aujourd'hui", value: '840 DT', color: 'text-green-600' },
                        { label: 'Nouvelles cmds', value: '6', color: 'text-[#1C1917]' },
                        { label: 'En livraison', value: '12', color: 'text-blue-600' },
                        { label: 'Livraison', value: '88%', color: 'text-[#1C1917]' },
                      ].map(s => (
                        <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm">
                          <p className="text-[8px] text-gray-400">{s.label}</p>
                          <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm">
                      <p className="text-[8px] font-semibold text-gray-500 mb-1.5">Commandes récentes</p>
                      {[
                        { name: 'Fatima K.', status: 'Confirmée', amount: 85 },
                        { name: 'Sara A.', status: 'Livrée', amount: 45 },
                        { name: 'Hamza T.', status: 'Expédiée', amount: 185 },
                      ].map((o, i) => (
                        <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                          <p className="text-[8px] font-medium text-gray-700">{o.name}</p>
                          <p className="text-[8px] font-bold text-gray-900">{o.amount} DT</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] mb-8">
                Toutes les fonctionnalités Hanut dans votre poche
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {FEATURES.map(f => (
                  <div key={f.title} className="flex gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0 text-xl">
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1C1917] mb-1">{f.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="w-12 h-12 bg-[#0B5E46] rounded-2xl mx-auto mb-5 flex items-center justify-center text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="7" y="2" width="10" height="20" rx="2" />
                <path d="M11 18h2" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#1C1917] mb-2">Soyez prévenu au lancement</h2>
            <p className="text-sm text-gray-500 mb-6">
              Laissez votre email pour être parmi les premiers à accéder à l&apos;app mobile Hanut.
            </p>

            {status === 'success' ? (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-sm text-green-700 font-semibold">
                ✓ {msg}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A]"
                />
                {status === 'error' && (
                  <p className="text-xs text-red-600">{msg}</p>
                )}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-[#16A34A] hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  {status === 'loading' ? 'Inscription...' : 'Me prévenir au lancement'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
