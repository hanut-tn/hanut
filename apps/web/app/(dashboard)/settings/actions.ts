'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ProfileInput = {
  name: string
  phone: string
}

export async function updateProfile(input: ProfileInput) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const { error } = await supabase
    .from('sellers')
    .update({
      name: input.name.trim(),
      phone: input.phone.trim() || null,
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings')
  revalidatePath('/dashboard')
}

export async function updateSlug(slug: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const cleaned = slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!cleaned || cleaned.length < 3) throw new Error('Le slug doit contenir au moins 3 caractères.')
  if (cleaned.length > 50) throw new Error('Le slug est trop long (50 caractères max).')

  const { error } = await supabase
    .from('sellers')
    .update({ slug: cleaned })
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505') throw new Error('Ce slug est déjà pris. Essayez-en un autre.')
    throw new Error(error.message)
  }

  revalidatePath('/settings')
}

export async function checkSlugAvailability(slug: string): Promise<boolean> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const cleaned = slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!cleaned || cleaned.length < 3) return false

  const { data } = await supabase
    .from('sellers')
    .select('id')
    .eq('slug', cleaned)
    .neq('id', user.id)
    .maybeSingle()

  return data === null
}
