'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StorefrontTemplate } from '@hanut/types'
import { DEFAULT_STOREFRONT_CONFIG } from '@hanut/types'
import { saveOnboardingStep, saveStyleStep, completeOnboarding } from '@/app/(onboarding)/setup/actions'
import ProgressBar from './ProgressBar'
import WelcomeStep from './steps/WelcomeStep'
import StyleStep from './steps/StyleStep'
import ProductStep from './steps/ProductStep'
import LiveStep from './steps/LiveStep'

export type OnboardingSeller = {
  name: string
  slug: string | null
  shop_name: string | null
  shop_description: string | null
}

type Props = {
  initialStep: number
  plan: 'starter' | 'pro' | 'business'
  seller: OnboardingSeller
  initialTemplate: StorefrontTemplate
  initialColor: string
}

type SetupData = {
  shop_name: string
  template: StorefrontTemplate
  primary_color: string
  slug: string | null
}

const STEPS = [
  { id: 1, label: 'Bienvenue', skippable: false },
  { id: 2, label: 'Style', skippable: true },
  { id: 3, label: 'Produit', skippable: true },
  { id: 4, label: 'Boutique', skippable: false },
]

export default function SetupFlow({ initialStep, plan, seller, initialTemplate, initialColor }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), 4))
  const [data, setData] = useState<SetupData>({
    shop_name: seller.shop_name ?? '',
    template: initialTemplate,
    primary_color: initialColor,
    slug: seller.slug,
  })

  function patch(update: Partial<SetupData>) {
    setData(d => ({ ...d, ...update }))
  }

  // Persistance de l'étape courante en best-effort : elle sert uniquement à
  // reprendre le flow au bon endroit si le vendeur revient plus tard, pas à
  // bloquer la navigation si la requête est lente ou échoue.
  function persistStep(next: number) {
    void saveOnboardingStep(next)
  }

  function goNext() {
    setStep(s => {
      const next = Math.min(s + 1, 4)
      persistStep(next)
      return next
    })
  }

  function goBack() {
    setStep(s => {
      const prev = Math.max(s - 1, 1)
      persistStep(prev)
      return prev
    })
  }

  // "Passer" ne saute jamais la sauvegarde : l'étape Style enregistre les
  // valeurs par défaut (le vendeur n'a rien choisi, mais storefront_config
  // doit exister avec une valeur cohérente). L'étape Produit n'a pas
  // d'équivalent sensé — créer un produit factice polluerait le catalogue —
  // donc "Passer" y avance seulement, sans écrire de produit.
  async function skipStyle() {
    const defaults = { template: 'mode' as StorefrontTemplate, primary_color: DEFAULT_STOREFRONT_CONFIG.primary_color }
    patch(defaults)
    await saveStyleStep(defaults)
    goNext()
  }

  function skipProduct() {
    goNext()
  }

  async function handleFinish() {
    await completeOnboarding()
    router.push('/dashboard')
  }

  return (
    <div>
      <ProgressBar current={step} total={4} steps={STEPS} />

      <div className="mt-8">
        {step === 1 && (
          <WelcomeStep
            initialShopName={data.shop_name}
            onSaved={result => {
              patch({ shop_name: result.shop_name, slug: result.slug ?? data.slug })
              goNext()
            }}
          />
        )}
        {step === 2 && (
          <StyleStep
            template={data.template}
            primaryColor={data.primary_color}
            plan={plan}
            onNext={values => { patch(values); goNext() }}
            onSkip={skipStyle}
            onBack={goBack}
          />
        )}
        {step === 3 && (
          <ProductStep
            onNext={goNext}
            onSkip={skipProduct}
            onBack={goBack}
          />
        )}
        {step === 4 && (
          <LiveStep
            sellerName={data.shop_name || seller.name}
            slug={data.slug}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  )
}
