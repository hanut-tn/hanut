'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type CustomerInput = {
  name: string
  phone: string
  address?: string
  city?: string
}

export async function updateCustomer(id: string, input: CustomerInput) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const { error } = await supabase
    .from('customers')
    .update({
      name: input.name.trim(),
      phone: input.phone.trim(),
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
    })
    .eq('id', id)
    .eq('seller_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
}

export async function deleteCustomer(id: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', id)
    .eq('seller_id', user.id)

  if (count && count > 0) {
    throw new Error(
      `Ce client a ${count} commande${count > 1 ? 's' : ''}. Supprimez d'abord ses commandes avant de supprimer le client.`
    )
  }

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('seller_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/customers')
}
