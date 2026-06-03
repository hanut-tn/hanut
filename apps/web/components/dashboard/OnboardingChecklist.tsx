'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle } from 'lucide-react'

type Props = {
  productAdded: boolean
  linkCopied: boolean
  firstOrder: boolean
  slug: string | null
}

export default function OnboardingChecklist({ productAdded, linkCopied: initLC, firstOrder, slug }: Props) {
  const router = useRouter()
  const [linkCopied, setLinkCopied] = useState(initLC)
  const [dismissed, setDismissed] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [hidden, setHidden] = useState(false)

  const completedCount = [productAdded, linkCopied, firstOrder].filter(Boolean).length
  const allDone = completedCount === 3

  useEffect(() => {
    if (sessionStorage.getItem('hanut_onboarding_dismissed') === '1') {
      setDismissed(true)
    }
  }, [])

  useEffect(() => {
    if (!allDone || celebrating) return
    setCelebrating(true)
    const timer = setTimeout(() => {
      fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      }).catch(() => {})
      setHidden(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [allDone, celebrating])

  if (hidden || dismissed) return null

  function handleCopyLink() {
    if (!slug) {
      router.push('/settings?tab=link')
      return
    }
    navigator.clipboard?.writeText(`${window.location.origin}/order/${slug}`).catch(() => {})
    fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'link_copied' }),
    }).catch(() => {})
    setLinkCopied(true)
  }

  function handleDismiss() {
    sessionStorage.setItem('hanut_onboarding_dismissed', '1')
    setDismissed(true)
  }

  if (celebrating) {
    return (
      <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-5 flex items-center gap-4">
        <span className="text-2xl">🎉</span>
        <div>
          <p className="font-bold text-[#0B5E46]">Vous êtes prêt ! Bonne vente !</p>
          <p className="text-sm text-[#16A34A] mt-0.5">Votre boutique est configurée. Les commandes peuvent arriver.</p>
        </div>
      </div>
    )
  }

  const steps = [
    {
      key: 'product',
      done: productAdded,
      title: 'Ajoutez votre premier produit',
      desc: 'Créez votre catalogue pour recevoir des commandes',
      cta: 'Ajouter un produit',
      action: () => router.push('/catalog'),
    },
    {
      key: 'link',
      done: linkCopied,
      title: 'Copiez votre lien de commande',
      desc: 'Partagez-le sur Instagram, WhatsApp ou TikTok',
      cta: slug ? 'Copier mon lien' : 'Créer mon lien',
      action: handleCopyLink,
    },
    {
      key: 'order',
      done: firstOrder,
      title: 'Recevez votre première commande',
      desc: 'Vos clients commandent via votre lien, vous les confirmez',
      cta: 'Voir mes commandes',
      action: () => router.push('/orders'),
    },
  ]

  return (
    <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-5">
      <div className="mb-4">
        <h2 className="font-bold text-[#0B5E46] text-base">Bienvenue sur Hanut 👋</h2>
        <p className="text-sm text-[#16A34A] mt-0.5">Suivez ces 3 étapes pour commencer à recevoir des commandes</p>
      </div>

      <div className="mb-4">
        <p className="text-xs text-[#78716C] mb-1.5">{completedCount}/3 étapes complétées</p>
        <div className="w-full bg-[#BBF7D0] rounded-full h-1.5">
          <div
            className="bg-[#16A34A] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.key}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              step.done ? 'opacity-60' : 'bg-white border border-[#E7E5E4]'
            }`}
          >
            {step.done ? (
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-[#A8A29E] shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? 'line-through text-[#78716C]' : 'text-[#1C1917]'}`}>
                {step.title}
              </p>
              {!step.done && <p className="text-xs text-[#A8A29E] mt-0.5">{step.desc}</p>}
            </div>
            {!step.done && (
              <button
                onClick={step.action}
                className="shrink-0 text-xs font-medium text-[#16A34A] hover:text-[#15803D] border border-[#16A34A]/30 hover:border-[#16A34A]/60 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                {step.cta} →
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={handleDismiss}
          className="text-xs text-[#A8A29E] hover:text-[#78716C] transition-colors"
        >
          Ignorer pour l&apos;instant
        </button>
      </div>
    </div>
  )
}
