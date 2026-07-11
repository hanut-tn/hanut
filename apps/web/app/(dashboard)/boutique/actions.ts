'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { requireActive } from '@/lib/assert-active'
import { revalidatePath } from 'next/cache'
import {
  DEFAULT_STOREFRONT_CONFIG, type StorefrontConfig,
} from '@hanut/types'
import { isValidHexColor } from '@/lib/storefront/colors'

const ConfigSchema = z.object({
  theme: z.enum(['moderne', 'elegant', 'bold', 'sombre', 'nature', 'pastel']).optional(),
  primary_color: z.string().refine(isValidHexColor, 'Couleur invalide.').optional(),
  layout: z.enum(['grid-2', 'grid-3', 'list']).optional(),
})

export async function getStorefrontConfig(): Promise<StorefrontConfig> {
  const context = await getUserContext()
  if (!context) return DEFAULT_STOREFRONT_CONFIG

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('sellers')
    .select('storefront_config')
    .eq('id', context.sellerId)
    .single()

  return {
    ...DEFAULT_STOREFRONT_CONFIG,
    ...(data?.storefront_config as Partial<StorefrontConfig> | null ?? {}),
  }
}

export async function updateStorefrontConfig(config: Partial<StorefrontConfig>): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const parsed = ConfigSchema.safeParse(config)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createServerClient()

  const { data: existing } = await supabase
    .from('sellers')
    .select('storefront_config')
    .eq('id', context.sellerId)
    .single()

  const nextConfig: StorefrontConfig = {
    ...DEFAULT_STOREFRONT_CONFIG,
    ...(existing?.storefront_config as Partial<StorefrontConfig> | null ?? {}),
    ...parsed.data,
  }

  const { error } = await supabase
    .from('sellers')
    .update({ storefront_config: nextConfig })
    .eq('id', context.sellerId)

  if (error) return { error: error.message }

  revalidatePath('/boutique')
  revalidatePath('/s/[slug]', 'page')
  return {}
}
