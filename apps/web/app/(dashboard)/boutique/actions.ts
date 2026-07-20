'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { requireActive } from '@/lib/assert-active'
import { revalidatePath } from 'next/cache'
import { DEFAULT_STOREFRONT_CONFIG, type StorefrontConfig } from '@hanut/types'
import { isValidHexColor } from '@/lib/storefront/colors'

const HexColor = z.string().refine(isValidHexColor, 'Couleur invalide.')

const ConfigSchema = z.object({
  template: z.enum(['luxe', 'mode', 'fresh', 'dark']),
  primary_color: HexColor,
  layout: z.enum(['grid-2', 'grid-3', 'list']),
}).partial()

export type ShopInfo = {
  shop_name: string | null
  shop_description: string | null
  logo_url: string | null
  banner_url: string | null
}

export async function getStorefrontData(): Promise<{ config: StorefrontConfig; shopInfo: ShopInfo }> {
  const context = await getUserContext()
  if (!context) return { config: DEFAULT_STOREFRONT_CONFIG, shopInfo: { shop_name: null, shop_description: null, logo_url: null, banner_url: null } }

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('sellers')
    .select('storefront_config, shop_name, shop_description, logo_url, banner_url')
    .eq('id', context.sellerId)
    .single()

  return {
    config: { ...DEFAULT_STOREFRONT_CONFIG, ...(data?.storefront_config as Partial<StorefrontConfig> | null ?? {}) },
    shopInfo: {
      shop_name: data?.shop_name ?? null,
      shop_description: data?.shop_description ?? null,
      logo_url: data?.logo_url ?? null,
      banner_url: data?.banner_url ?? null,
    },
  }
}

/** Une seule action, un seul UPDATE sur `sellers` — config visuelle et
 * identité (nom/description/logo/bannière) sont enregistrées ensemble. */
export async function saveStorefrontData(
  config: Partial<StorefrontConfig>,
  shopInfo: Partial<ShopInfo>
): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const parsedConfig = ConfigSchema.safeParse(config)
  if (!parsedConfig.success) return { error: parsedConfig.error.issues[0].message }

  // Personnalisation boutique (templates hors Mode, couleur, logo, bannière)
  // réservée au plan Pro — cf. audit limites de plan. L'UI bloque déjà ces
  // contrôles pour Starter ; ce filet de sécurité serveur empêche un
  // contournement direct de l'action.
  const isStarter = context.plan === 'starter'
  if (isStarter && parsedConfig.data.template && parsedConfig.data.template !== 'mode') {
    return { error: 'Ce template est disponible uniquement sur le plan Pro.' }
  }

  const shopName = (shopInfo.shop_name ?? '').trim()
  const shopDescription = (shopInfo.shop_description ?? '').trim()
  let logoUrl = shopInfo.logo_url?.trim() || null
  let bannerUrl = shopInfo.banner_url?.trim() || null

  if (shopName.length > 100) return { error: 'Le nom de la boutique est trop long (100 caractères max).' }
  if (shopDescription.length > 300) return { error: 'La description est trop longue (300 caractères max).' }
  // Doit provenir du stockage Supabase du projet : toute autre origine est
  // bloquée silencieusement par la CSP (img-src), le logo/bannière resterait
  // cassé. On retire un éventuel slash final de la variable d'env avant de
  // concaténer : sinon un "/" de trop dans NEXT_PUBLIC_SUPABASE_URL donne un
  // double slash qui ne matche plus l'URL réelle (simple slash, normalisée
  // en interne par le SDK Supabase Storage).
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
  const storagePrefix = `${supabaseUrl}/storage/v1/object/public/`
  if (logoUrl && (logoUrl.length > 2048 || !logoUrl.startsWith(storagePrefix))) {
    return { error: `URL de logo invalide. Reçu="${logoUrl}" Attendu="${storagePrefix}"` }
  }
  if (bannerUrl && (bannerUrl.length > 2048 || !bannerUrl.startsWith(storagePrefix))) {
    return { error: `URL de bannière invalide. Reçu="${bannerUrl}" Attendu="${storagePrefix}"` }
  }

  const supabase = await createServerClient()

  const { data: existing } = await supabase
    .from('sellers')
    .select('storefront_config')
    .eq('id', context.sellerId)
    .single()

  const nextConfig: StorefrontConfig = {
    ...DEFAULT_STOREFRONT_CONFIG,
    ...(existing?.storefront_config as Partial<StorefrontConfig> | null ?? {}),
    ...parsedConfig.data,
  }

  if (isStarter) {
    // Filet de sécurité serveur, même logique que le blocage de template :
    // un Starter ne doit jamais pouvoir enregistrer une couleur, un logo ou
    // une bannière personnalisés, quel que soit ce qui a été envoyé.
    nextConfig.primary_color = DEFAULT_STOREFRONT_CONFIG.primary_color
    logoUrl = null
    bannerUrl = null
  }

  const { error } = await supabase
    .from('sellers')
    .update({
      storefront_config: nextConfig,
      shop_name: shopName || null,
      shop_description: shopDescription || null,
      logo_url: logoUrl,
      banner_url: bannerUrl,
    })
    .eq('id', context.sellerId)

  if (error) return { error: error.message }

  revalidatePath('/boutique')
  revalidatePath('/s/[slug]', 'page')
  return {}
}
