'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { HANUT_CONTACT } from '@/lib/constants'

const FAQ = [
  {
    q: 'Je ne suis pas tech — c\'est compliqué à utiliser ?',
    a: 'Non. Si vous pouvez utiliser Instagram, vous pouvez utiliser Hanut. L\'onboarding prend 2 minutes. Vous avez votre boutique live avant même de terminer votre café.',
  },
  {
    q: 'Mes clients peuvent payer à la livraison ?',
    a: 'Oui. Hanut est conçu pour le COD tunisien. Vos clients paient cash au livreur. Vous recevez les fonds via virement.',
  },
  {
    q: 'Si ça ne me convient pas, je peux annuler ?',
    a: 'Oui, quand vous voulez. Aucun engagement. Aucune pénalité. Vous annulez en un clic depuis vos paramètres.',
  },
  {
    q: 'Qu\'est-ce qui se passe après les 14 jours ?',
    a: 'Vous choisissez un plan (Starter 39 DT ou Pro 79 DT). Si vous ne choisissez pas, votre boutique reste active mais les commandes sont suspendues — vous ne perdez rien.',
  },
  {
    q: 'Et si j\'ai besoin d\'aide ?',
    a: `Je réponds personnellement sur WhatsApp au ${HANUT_CONTACT.whatsapp.replace('+216', '+216 ')}. Ce n'est pas un bot. C'est moi, Youssef, le fondateur.`,
  },
]

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-playfair text-center text-4xl text-[#1C1917] sm:text-5xl">
          Questions fréquentes
        </h2>

        <div className="mt-12 divide-y divide-neutral-100 border-t border-neutral-100">
          {FAQ.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-[#1C1917]">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <p className="pb-5 pr-8 text-sm leading-relaxed text-neutral-500">
                    {item.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
