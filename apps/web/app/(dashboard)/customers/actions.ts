'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { revalidatePath } from 'next/cache'

export type CustomerInput = {
  name: string
  phone: string
  address?: string
  city?: string
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }

  const supabase = await createServerClient()

  const { error } = await supabase
    .from('customers')
    .update({
      name: input.name.trim(),
      phone: input.phone.trim(),
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
    })
    .eq('id', id)
    .eq('seller_id', context.sellerId)

  if (error) return { error: error.message }

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'customer_updated',
    entityType: 'customer',
    entityId: id,
    description: `a modifié le client ${input.name.trim()}`,
  })

  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  return {}
}

export async function deleteCustomer(id: string): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }

  const supabase = await createServerClient()

  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', id)
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)

  if (count && count > 0) {
    return {
      error: `Ce client a ${count} commande${count > 1 ? 's' : ''}. Supprimez d'abord ses commandes avant de supprimer le client.`,
    }
  }

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('seller_id', context.sellerId)

  if (error) return { error: error.message }
  revalidatePath('/customers')
  return {}
}
