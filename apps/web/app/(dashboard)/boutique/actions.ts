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
import { mergeStorefrontConfig, type StorefrontConfigPatch } from '@/lib/storefront/config'

const HexColor = z.string().refine(isValidHexColor, 'Couleur invalide.')

const ConfigSchema = z.object({
  colors: z.object({
    primary: HexColor,
    pageBg: HexColor,
    cardBg: HexColor,
    textPrimary: HexColor,
    textSecondary: HexColor,
  }).partial().optional(),
  typography: z.object({
    font: z.enum(['inter', 'poppins', 'playfair', 'montserrat', 'cairo', 'tajawal', 'raleway', 'nunito']),
    size: z.enum(['small', 'normal', 'large']),
  }).partial().optional(),
  cards: z.object({
    radius: z.enum(['none', 'rounded', 'full']),
    shadow: z.enum(['none', 'sm', 'md']),
    imageRatio: z.enum(['square', 'portrait', 'landscape']),
  }).partial().optional(),
  button: z.object({
    text: z.string().trim().min(1).max(30),
    radius: z.enum(['none', 'rounded', 'full']),
  }).partial().optional(),
  search: z.object({
    bg: HexColor,
    borderColor: HexColor,
    textColor: HexColor,
  }).partial().optional(),
  chips: z.object({
    bg: HexColor,
    textColor: HexColor,
    activeBg: HexColor,
    activeTextColor: HexColor,
  }).partial().optional(),
  cartBar: z.object({
    bg: HexColor,
    textColor: HexColor,
    buttonBg: HexColor,
    buttonTextColor: HexColor,
  }).partial().optional(),
  productName: z.object({
    color: HexColor,
    size: z.enum(['small', 'normal', 'large']),
    weight: z.enum(['normal', 'medium', 'semibold', 'bold']),
  }).partial().optional(),
  productPrice: z.object({
    color: HexColor,
    size: z.enum(['small', 'normal', 'large']),
    weight: z.enum(['normal', 'medium', 'semibold', 'bold']),
  }).partial().optional(),
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

  return mergeStorefrontConfig(DEFAULT_STOREFRONT_CONFIG, data?.storefront_config as StorefrontConfigPatch | null)
}

export async function updateStorefrontConfig(config: StorefrontConfigPatch): Promise<{ error?: string }> {
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

  const nextConfig: StorefrontConfig = mergeStorefrontConfig(
    DEFAULT_STOREFRONT_CONFIG,
    existing?.storefront_config as StorefrontConfigPatch | null,
    parsed.data
  )

  const { error } = await supabase
    .from('sellers')
    .update({ storefront_config: nextConfig })
    .eq('id', context.sellerId)

  if (error) return { error: error.message }

  revalidatePath('/boutique')
  revalidatePath('/s/[slug]', 'page')
  return {}
}
