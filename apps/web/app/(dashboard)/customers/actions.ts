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

  // Récupérer le nom du client pour le log
  const { data: customerData } = await supabase
    .from('customers')
    .select('name')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .single()

  // Bloquer si commandes actives (non soft-deleted)
  const { count: activeCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', id)
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)

  if (activeCount && activeCount > 0) {
    return {
      error: `Ce client a ${activeCount} commande${activeCount > 1 ? 's' : ''} active${activeCount > 1 ? 's' : ''}. Supprimez-les d'abord avant de supprimer le client.`,
    }
  }

  // Bloquer si commandes en corbeille (FK constraint DB)
  const { count: trashedCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', id)
    .eq('seller_id', context.sellerId)
    .not('deleted_at', 'is', null)

  if (trashedCount && trashedCount > 0) {
    return {
      error: `Ce client a ${trashedCount} commande${trashedCount > 1 ? 's' : ''} dans la corbeille. Videz la corbeille d'abord avant de supprimer le client.`,
    }
  }

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('seller_id', context.sellerId)

  if (error) return { error: error.message }

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'customer_deleted',
    entityType: 'customer',
    entityId: id,
    description: `a supprimé le client ${customerData?.name ?? id}`,
  })

  revalidatePath('/customers')
  return {}
}
