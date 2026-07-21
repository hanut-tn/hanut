import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import SetupFlow from '@/components/onboarding/SetupFlow'
import { DEFAULT_STOREFRONT_CONFIG, type StorefrontConfig } from '@hanut/types'

export const metadata: Metadata = {
  title: 'Créons votre boutique — Hanut',
  robots: { index: false, follow: false },
}

export default async function SetupPage() {
  const context = await getUserContext()
  if (!context) redirect('/login')
  // L'onboarding ne concerne que le propriétaire — un membre d'équipe
  // rejoint toujours une boutique déjà configurée.
  if (!context.isSeller) redirect('/dashboard')

  const supabase = await createServerClient()
  const { data: seller } = await supabase
    .from('sellers')
    .select('name, shop_name, shop_description, slug, storefront_config, onboarding_completed, onboarding_step')
    .eq('id', context.sellerId)
    .single()

  // Flow déjà terminé (ou vendeur pré-existant backfillé par la migration) —
  // /setup n'est pas fait pour être revisité.
  if (!seller || seller.onboarding_completed) redirect('/dashboard')

  const config: StorefrontConfig = {
    ...DEFAULT_STOREFRONT_CONFIG,
    ...(seller.storefront_config as Partial<StorefrontConfig> | null ?? {}),
  }

  return (
    <SetupFlow
      initialStep={seller.onboarding_step ?? 1}
      plan={context.plan}
      seller={{
        name: seller.name ?? '',
        slug: seller.slug ?? null,
        shop_name: seller.shop_name ?? null,
        shop_description: seller.shop_description ?? null,
      }}
      initialTemplate={config.template}
      initialColor={config.primary_color}
    />
  )
}
