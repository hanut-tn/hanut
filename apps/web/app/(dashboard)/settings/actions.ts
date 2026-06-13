'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import { revalidatePath } from 'next/cache'
import { requireActive } from '@/lib/assert-active'

export type ProfileInput = {
  name: string
  phone: string
}

export async function updateProfile(input: ProfileInput) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (!context.isSeller) throw new Error('Réservé au propriétaire')
  const activeCheck = requireActive(context)
  if (activeCheck) throw new Error(activeCheck.error)

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('sellers')
    .update({
      name: input.name.trim(),
      phone: input.phone.trim() || null,
    })
    .eq('id', context.sellerId)

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/dashboard')
}

export async function updateSlug(slug: string) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (!context.isSeller) throw new Error('Réservé au propriétaire')
  const activeCheck = requireActive(context)
  if (activeCheck) throw new Error(activeCheck.error)

  const cleaned = slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!cleaned || cleaned.length < 3) throw new Error('Le slug doit contenir au moins 3 caractères.')
  if (cleaned.length > 50) throw new Error('Le slug est trop long (50 caractères max).')

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('sellers')
    .update({ slug: cleaned })
    .eq('id', context.sellerId)

  if (error) {
    if (error.code === '23505') throw new Error('Ce slug est déjà pris. Essayez-en un autre.')
    throw new Error(error.message)
  }

  revalidatePath('/settings')
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
