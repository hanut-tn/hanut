'use client'

import { Fragment, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle } from 'lucide-react'

type Props = {
  productAdded: boolean
  slugCreated: boolean
  linkCopied: boolean
  firstOrder: boolean
  slug: string | null
}

export default function OnboardingChecklist({ productAdded, slugCreated, linkCopied: initLC, firstOrder, slug }: Props) {
  const router = useRouter()
  const completedOnMount = useRef(productAdded && slugCreated && initLC && firstOrder).current
  const [linkCopied, setLinkCopied] = useState(initLC)
  const [firstOrderSeen, setFirstOrderSeen] = useState(firstOrder)
  const [dismissed, setDismissed] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const [hidden, setHidden] = useState(completedOnMount)

  const completedCount = [productAdded, slugCreated, linkCopied, firstOrderSeen].filter(Boolean).length
  const allDone = completedCount === 4


  useEffect(() => {
    setLinkCopied(initLC)
  }, [initLC])

  useEffect(() => {
    setFirstOrderSeen(firstOrder)
  }, [firstOrder])

  useEffect(() => {
    if (allDone || hidden || dismissed) return
    const timer = setInterval(() => {
      router.refresh()
    }, 30000)
    return () => clearInterval(timer)
  }, [allDone, hidden, dismissed, router])

  useEffect(() => {
    if (!allDone || dismissed) return

    // Persister immédiatement. Auparavant, ce PATCH était placé dans un timer
    // annulé dès que setCelebrating() déclenchait le nouveau rendu.
    const controller = new AbortController()
    void fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
      signal: controller.signal,
    }).then(response => {
      if (response.ok) router.refresh()
    }).catch(() => {})

    // Si les trois étapes étaient déjà terminées au chargement, ne pas rejouer
    // l'écran de félicitations : la bannière reste invisible.
    if (completedOnMount) {
      setHidden(true)
      return () => controller.abort()
    }

    setCelebrating(true)
    const fadeTimer = setTimeout(() => {
      setFadingOut(true)
    }, 2500)
    const hideTimer = setTimeout(() => {
      setHidden(true)
    }, 3000)

    return () => {
      controller.abort()
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [allDone, completedOnMount, dismissed, router])

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

  async function handleViewOrders() {
    setHidden(true)
    setFirstOrderSeen(true)
    await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'first_order' }),
    }).catch(() => {})

    if (productAdded && slugCreated && linkCopied) {
      await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      }).catch(() => {})
    }

    router.push('/orders')
  }

  async function handleDismiss() {
    setDismissed(true)
    await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'dismiss',
        until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    }).catch(() => {})
  }

  if (celebrating) {
    return (
      <div className={`bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-5 transition-opacity duration-500 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}>
        <div className="text-center py-4">
          <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto mb-2" />
          <p className="font-semibold text-[#0B5E46]">Vous êtes prêt !</p>
          <p className="text-xs text-[#78716C]">Bonne vente sur Hanut !</p>
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
      key: 'slug',
      done: slugCreated,
      title: "Créez l'URL de votre boutique",
      desc: 'Choisissez une adresse personnalisée pour votre page de commande',
      cta: "Créer mon URL",
      action: () => router.push('/settings?tab=link'),
    },
    {
      key: 'link',
      done: linkCopied,
      title: 'Copiez votre lien de commande',
      desc: 'Partagez-le sur Instagram, WhatsApp ou TikTok',
      cta: 'Copier mon lien',
      action: handleCopyLink,
    },
    {
      key: 'order',
      done: firstOrderSeen,
      title: 'Recevez votre première commande',
      desc: 'Vos clients commandent via votre lien, vous les confirmez',
      cta: 'Voir mes commandes',
      action: handleViewOrders,
    },
  ]
  const activeIndex = steps.findIndex(step => !step.done)

  return (
    <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-5">
      <div className="mb-4 space-y-3">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-bold text-[#0B5E46] text-base">Bienvenue sur Hanut</h2>
            <p className="shrink-0 text-xs text-[#78716C] mt-1">{completedCount}/4 complétées</p>
          </div>
          <p className="text-sm text-[#16A34A] mt-0.5">Suivez ces 4 étapes pour recevoir des commandes</p>
        </div>

        <div className="w-full bg-[#BBF7D0] rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#16A34A] h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(completedCount / 4) * 100}%` }}
          />
        </div>
      </div>

      <div>
        {steps.map((step, index) => {
          const isActive = !step.done && index === activeIndex

          return (
            <Fragment key={step.key}>
              {index > 0 && <div className="border-t border-[#E7E5E4] my-2" />}
              <div
                className={`transition-all duration-300 ${
                  isActive
                    ? 'bg-white border border-[#E7E5E4] rounded-lg p-3'
                    : 'py-1'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {step.done ? (
                      <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                    ) : (
                      <Circle className={`w-5 h-5 shrink-0 mt-0.5 ${isActive ? 'text-[#78716C]' : 'text-[#E7E5E4]'}`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm transition-colors duration-300 ${
                          step.done
                            ? 'text-[#78716C] line-through'
                            : isActive
                              ? 'font-semibold text-[#1C1917]'
                              : 'text-[#A8A29E]'
                        }`}
                      >
                        {step.title}
                      </p>
                      {isActive && (
                        <p className="text-xs text-[#78716C] mt-0.5">{step.desc}</p>
                      )}
                    </div>
                  </div>
                  {isActive && (
                    <button
                      onClick={step.action}
                      className="w-full sm:w-auto shrink-0 border border-[#16A34A] text-[#16A34A] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#F0FDF4] transition-colors whitespace-nowrap"
                    >
                      {step.cta} →
                    </button>
                  )}
                </div>
              </div>
            </Fragment>
          )
        })}
      </div>

      <div className="mt-4 flex justify-start">
        <button
          onClick={handleDismiss}
          className="text-xs text-[#78716C] hover:text-[#1C1917] cursor-pointer underline transition-colors"
        >
          Ignorer pour l&apos;instant
        </button>
      </div>
    </div>
  )
}
