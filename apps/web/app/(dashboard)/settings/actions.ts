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
