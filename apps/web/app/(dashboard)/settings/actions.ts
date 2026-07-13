'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import { revalidatePath } from 'next/cache'
import { requireActive } from '@/lib/assert-active'

export type ActionResult = { error?: string }

export type ProfileInput = {
  name: string
  phone: string
}

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (!context.isSeller) return { error: 'Réservé au propriétaire' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('sellers')
    .update({
      name: input.name.trim(),
      phone: input.phone.trim() || null,
    })
    .eq('id', context.sellerId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return {}
}

export async function updateSlug(slug: string): Promise<ActionResult> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (!context.isSeller) return { error: 'Réservé au propriétaire' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const cleaned = slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!cleaned || cleaned.length < 3) return { error: 'Le slug doit contenir au moins 3 caractères.' }
  if (cleaned.length > 50) return { error: 'Le slug est trop long (50 caractères max).' }

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('sellers')
    .update({ slug: cleaned })
    .eq('id', context.sellerId)

  if (error) {
    if (error.code === '23505') return { error: 'Ce slug est déjà pris. Essayez-en un autre.' }
    return { error: error.message }
  }

  revalidatePath('/settings')
  return {}
}

export async function checkSlugAvailability(slug: string): Promise<boolean> {
  const context = await getUserContext()
  if (!context) return false
  if (!context.isSeller) return false

  const cleaned = slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!cleaned || cleaned.length < 3) return false

  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from('sellers')
    .select('id')
    .eq('slug', cleaned)
    .neq('id', context.sellerId)
    .maybeSingle()

  return data === null
}
