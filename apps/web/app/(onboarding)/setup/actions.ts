'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { requireActive } from '@/lib/assert-active'
import { revalidatePath } from 'next/cache'
import { DEFAULT_STOREFRONT_CONFIG, type StorefrontConfig, type StorefrontTemplate } from '@hanut/types'
import { isValidHexColor } from '@/lib/storefront/colors'
import { upsertProduct } from '@/app/(dashboard)/catalog/actions'

// Même normalisation que updateSlug()/checkSlugAvailability() dans
// settings/actions.ts — un slug généré ici doit rester cohérent avec un
// slug saisi manuellement plus tard.
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Génère un slug unique à partir du nom de boutique. Boucle bornée : la
 * table sellers reste petite, une collision n'arrive que si plusieurs
 * boutiques portent un nom très proche. */
async function ensureUniqueSlug(
  supabase: SupabaseClient,
  baseName: string,
  sellerId: string
): Promise<string> {
  const root = slugify(baseName).length >= 3 ? slugify(baseName) : `boutique-${sellerId.slice(0, 8)}`
  let candidate = root
  for (let suffix = 2; suffix < 50; suffix++) {
    const { data } = await supabase
      .from('sellers')
      .select('id')
      .eq('slug', candidate)
      .neq('id', sellerId)
      .maybeSingle()
    if (!data) return candidate
    candidate = `${root}-${suffix}`
  }
  return `${root}-${sellerId.slice(0, 8)}`
}

const WelcomeSchema = z.object({
  shop_name: z.string().trim().min(1, 'Le nom de la boutique est obligatoire.').max(100, 'Le nom ne doit pas dépasser 100 caractères.'),
  shop_description: z.string().trim().max(300, 'La description ne doit pas dépasser 300 caractères.').optional(),
})

/** Étape 1 — nom + description. Génère aussi le slug public si le vendeur
 * n'en a pas encore (jamais requis pour créer un compte, mais indispensable
 * pour l'étape "Boutique en ligne" plus loin dans le flow). */
export async function saveWelcomeStep(data: {
  shop_name: string
  shop_description?: string
}): Promise<{ error?: string; slug?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (!context.isSeller) return { error: 'Réservé au propriétaire' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const parsed = WelcomeSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createServerClient()
  const { data: existing } = await supabase
    .from('sellers')
    .select('slug')
    .eq('id', context.sellerId)
    .single()

  const update: { shop_name: string; shop_description: string | null; slug?: string } = {
    shop_name: parsed.data.shop_name,
    shop_description: parsed.data.shop_description?.trim() || null,
  }

  let slug = existing?.slug ?? null
  if (!slug) {
    slug = await ensureUniqueSlug(supabase, parsed.data.shop_name, context.sellerId)
    update.slug = slug
  }

  const { error } = await supabase.from('sellers').update(update).eq('id', context.sellerId)
  if (error) return { error: error.message }

  revalidatePath('/setup')
  return { slug }
}

const StyleSchema = z.object({
  template: z.enum(['mode', 'luxe', 'fresh', 'dark']),
  primary_color: z.string().refine(isValidHexColor, 'Couleur invalide.'),
})

/** Étape 2 — template + couleur uniquement (patch du storefront_config
 * existant, ne touche jamais shop_name/logo/bannière). Même restriction de
 * plan que l'éditeur boutique complet (cf. audit limites de plan) : un
 * Starter ne peut pas choisir un template autre que Mode, même ici. */
export async function saveStyleStep(data: {
  template: StorefrontTemplate
  primary_color: string
}): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (!context.isSeller) return { error: 'Réservé au propriétaire' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const parsed = StyleSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const isStarter = context.plan === 'starter'
  if (isStarter && parsed.data.template !== 'mode') {
    return { error: 'Ce template est disponible uniquement sur le plan Pro.' }
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
    template: parsed.data.template,
    primary_color: isStarter ? DEFAULT_STOREFRONT_CONFIG.primary_color : parsed.data.primary_color,
  }

  const { error } = await supabase
    .from('sellers')
    .update({ storefront_config: nextConfig })
    .eq('id', context.sellerId)

  if (error) return { error: error.message }

  revalidatePath('/setup')
  return {}
}

const ProductStepSchema = z.object({
  name: z.string().trim().min(1, 'Le nom du produit est obligatoire.').max(200, 'Le nom ne doit pas dépasser 200 caractères.'),
  price: z.number().min(0, 'Le prix doit être positif ou nul.').max(100000, 'Le prix semble incorrect.'),
  stock: z.number().int('Le stock doit être un nombre entier.').min(0, 'Le stock doit être positif ou nul.'),
  image_url: z.string().url('URL de l’image invalide').max(2048).optional().nullable(),
})

/** Étape 3 — premier produit. Délègue à upsertProduct (catalogue) plutôt que
 * de dupliquer la logique de création — mêmes garanties (RLS, activity log,
 * revalidation catalogue) qu'un produit créé depuis le dashboard. */
export async function saveProductStep(data: {
  name: string
  price: number
  stock: number
  image_url?: string | null
}): Promise<{ error?: string; productId?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (!context.isSeller) return { error: 'Réservé au propriétaire' }

  const parsed = ProductStepSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const result = await upsertProduct({
    name: parsed.data.name,
    price: parsed.data.price,
    cost: null,
    stock: parsed.data.stock,
    low_stock_alert: 3,
    variants: [],
    image_url: parsed.data.image_url ?? null,
    description: null,
  })
  if (result.error) return { error: result.error }

  revalidatePath('/setup')
  return { productId: result.productId }
}

/** Étape courante — persistée à chaque changement d'étape pour reprendre le
 * flow au bon endroit si le vendeur revient plus tard (middleware redirige
 * vers /setup tant que onboarding_completed = false, sans connaître l'étape
 * sans cette valeur). */
export async function saveOnboardingStep(step: number): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (!context.isSeller) return { error: 'Réservé au propriétaire' }
  if (!Number.isInteger(step) || step < 1 || step > 5) return { error: 'Étape invalide.' }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('sellers')
    .update({ onboarding_step: step })
    .eq('id', context.sellerId)

  if (error) return { error: error.message }
  return {}
}

/** Termine l'onboarding — débloque immédiatement le dashboard (le
 * middleware vérifie onboarding_completed en base à chaque requête, pas de
 * claim JWT à rafraîchir, donc pas de délai). */
export async function completeOnboarding(): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (!context.isSeller) return { error: 'Réservé au propriétaire' }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('sellers')
    .update({ onboarding_completed: true, onboarding_step: 5 })
    .eq('id', context.sellerId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/setup')
  return {}
}
