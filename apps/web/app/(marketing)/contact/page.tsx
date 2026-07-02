'use client'

import { useState } from 'react'
import { HANUT_CONTACT } from '@/lib/constants'
import { TurnstileWidget, isTurnstileEnabled } from '@/components/ui/TurnstileWidget'

const FAQ = [
  {
    q: 'Comment créer mon compte ?',
    a: "Cliquez sur \"Commencer\" en haut de la page. La création de compte prend moins de 2 minutes : email, mot de passe, et vous êtes dans le tableau de bord.",
  },
  {
    q: 'Comment connecter un livreur ?',
    a: "Depuis vos Paramètres → Livreurs, ajoutez vos identifiants API IntiGo, Navex ou Adex. Un guide pas-à-pas est disponible pour chaque livreur.",
  },
  {
    q: 'Comment partager mon lien de commande ?',
    a: "Dans Paramètres → Lien commande, personnalisez votre slug (hanut.tn/order/votre-boutique) et copiez le lien pour le mettre dans votre bio Instagram ou statut WhatsApp.",
  },
  {
    q: 'Hanut fonctionne-t-il sans site web ?',
    a: "Oui, c'est fait pour ça. Hanut est conçu pour les vendeurs qui vendent via DM (WhatsApp, Instagram). Pas besoin de site e-commerce.",
  },
  {
    q: 'Comment fonctionne le COD ?',
    a: "Quand vous créez une expédition, Hanut suit le statut COD (en attente de collecte, collecté par le livreur, reversé). Vous savez toujours exactement ce qui vous est dû.",
  },
  {
    q: "Y a-t-il une application mobile ?",
    a: "L'app iOS et Android est en développement. Inscrivez-vous sur la liste d'attente sur la page Mobile pour être prévenu au lancement.",
  },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  function updateField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, turnstile_token: turnstileToken }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMsg(data.message ?? 'Message envoyé !')
        setForm({ name: '', email: '', message: '' })
      } else {
        setStatus('error')
        setMsg(data.error ?? 'Une erreur est survenue')
        setTurnstileResetKey(k => k + 1)
      }
    } catch {
      setStatus('error')
      setMsg('Erreur réseau. Réessayez.')
      setTurnstileResetKey(k => k + 1)
    }
  }

  return (
    <div className="bg-[#FAFAF9]">
      {/* Hero */}
      <section className="pt-20 pb-12 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-[#16A34A] uppercase tracking-widest mb-4">Contact</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1C1917] leading-tight tracking-tight mb-5">
            On est là pour vous aider
          </h1>
          <p className="text-lg text-gray-500">Réponse garantie en moins d&apos;une heure pendant les heures de travail.</p>
        </div>
      </section>

      {/* Contact methods + Form */}
      <section className="pb-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Methods */}
            <div className="space-y-4">
              {/* WhatsApp */}
              <a
                href={`${HANUT_CONTACT.whatsappUrl}?text=${encodeURIComponent('Bonjour Hanut, j\'ai une question : ')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-all hover:border-green-200 group"
              >
                <div className="w-12 h-12 bg-[#25D366] rounded-2xl flex items-center justify-center shrink-0 shadow-sm shadow-green-100">
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.115 1.522 5.847L0 24l6.347-1.498A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.817 9.817 0 01-5.007-1.37l-.359-.213-3.72.877.894-3.629-.234-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-[#1C1917]">WhatsApp</p>
                    <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 shrink-0">
                      Réponse en &lt; 1h
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">Chattez directement avec notre équipe support</p>
                </div>
              </a>

              {/* Email */}
              <a
                href="mailto:hanut.tn@gmail.com"
                className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-all hover:border-blue-200 group"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="#3B82F6" strokeWidth="1.5"/>
                    <path d="M3 8L12 13L21 8" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-[#1C1917]">Email</p>
                  <p className="text-sm text-[#16A34A] font-medium mt-0.5">hanut.tn@gmail.com</p>
                </div>
              </a>

              {/* Contact form */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-bold text-[#1C1917] mb-4">Envoyer un message</h2>

                {status === 'success' ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-5 text-center">
                    <div className="text-2xl mb-2">✓</div>
                    <p className="font-semibold text-green-700">{msg}</p>
                    <p className="text-sm text-green-600 mt-1">On vous répondra dans les plus brefs délais.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-semibold text-gray-500 mb-1.5">Nom complet *</label>
                      <input
                        id="contact-name"
                        required
                        aria-required="true"
                        value={form.name}
                        onChange={updateField('name')}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A] transition-colors"
                        placeholder="Yasmine Ben Ali"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-xs font-semibold text-gray-500 mb-1.5">Email *</label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        aria-required="true"
                        value={form.email}
                        onChange={updateField('email')}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A] transition-colors"
                        placeholder="vous@email.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-message" className="block text-xs font-semibold text-gray-500 mb-1.5">Message *</label>
                      <textarea
                        id="contact-message"
                        required
                        aria-required="true"
                        rows={4}
                        value={form.message}
                        onChange={updateField('message')}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A] transition-colors resize-none"
                        placeholder="Décrivez votre question ou problème…"
                      />
                    </div>
                    {isTurnstileEnabled() && (
                      <TurnstileWidget onVerify={setTurnstileToken} resetKey={turnstileResetKey} />
                    )}
                    {status === 'error' && (
                      <p role="alert" className="text-xs text-red-600">{msg}</p>
                    )}
                    <button
                      type="submit"
                      disabled={status === 'loading' || (isTurnstileEnabled() && !turnstileToken)}
                      className="w-full bg-[#16A34A] text-white font-semibold py-2.5 rounded-lg transition-all duration-150 ease-out hover:bg-green-700 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-[#16A34A]/40 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:ring-0 disabled:active:scale-100"
                    >
                      {status === 'loading' ? 'Envoi...' : 'Envoyer le message'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h2 className="font-bold text-[#1C1917] text-lg mb-5">Questions fréquentes</h2>
              <div className="space-y-3">
                {FAQ.map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-semibold text-[#1C1917] text-sm">{item.q}</span>
                      <svg
                        width="18" height="18" viewBox="0 0 18 18" fill="none"
                        className={`shrink-0 transition-transform text-gray-400 ${openFaq === i ? 'rotate-180' : ''}`}
                      >
                        <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {openFaq === i && (
                      <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
