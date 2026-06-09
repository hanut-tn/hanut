'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { CarrierName } from '@hanut/types'

export type CreateDeliveryInput = {
  order_id: string
  carrier: CarrierName
  tracking_number?: string
  fee?: number
}

export type UpdateDeliveryInput = {
  tracking_number?: string | null
  carrier_status?: string | null
  fee?: number | null
  cod_collected?: boolean
  cod_reversed?: boolean
}

export async function createDelivery(input: CreateDeliveryInput) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (context.role === 'readonly') throw new Error('Action réservée aux admins et opérateurs')

  const supabase = await createServerClient()

  const { error } = await supabase.from('deliveries').insert({
    order_id: input.order_id,
    carrier: input.carrier,
    tracking_number: input.tracking_number || null,
    fee: input.fee ?? null,
  })
  if (error) throw new Error(error.message)

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'delivery_created',
    entityType: 'delivery',
    description: `a créé une livraison via ${input.carrier}`,
    metadata: { carrier: input.carrier, tracking: input.tracking_number },
  })

  revalidatePath('/deliveries')
  revalidatePath('/dashboard')
  revalidateTag('dashboard')
}

export async function updateDelivery(id: string, input: UpdateDeliveryInput) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (context.role === 'readonly') throw new Error('Action réservée aux admins et opérateurs')

  const supabase = await createServerClient()

  const patch: Record<string, unknown> = { ...input }

  if (input.cod_collected === true) {
    patch.delivered_at = new Date().toISOString()
  } else if (input.cod_collected === false) {
    patch.delivered_at = null
    patch.cod_reversed = false
  }

  const { error } = await supabase.from('deliveries').update(patch).eq('id', id)
  if (error) throw new Error(error.message)

  // Amélioration 5 : COD collecté → commande "Livrée"
  if (input.cod_collected === true) {
    const { data: delivery } = await supabase
      .from('deliveries').select('order_id').eq('id', id).single()

    if (delivery?.order_id) {
      await supabase.from('orders')
        .update({ status: 'delivered' })
        .eq('id', delivery.order_id)
        .eq('seller_id', context.sellerId)

      await supabase.from('order_status_history').insert({
        order_id: delivery.order_id,
        status: 'delivered',
        changed_by: context.userId,
      })

      const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()
      await logActivity({
        sellerId: context.sellerId,
        userId: context.userId,
        userName: seller?.name ?? context.userId,
        actionType: 'order_status_changed',
        entityType: 'order',
        entityId: delivery.order_id,
        description: 'commande marquée comme livrée (COD collecté)',
      })
    }
  }

  revalidatePath('/deliveries')
  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidateTag('dashboard')
}

export async function createDeliveryFromOrder(
  orderId: string,
  carrier: string,
  tracking: string | undefined,
  fee: number,
): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }

  const supabase = await createServerClient()

  const { error: deliveryError } = await supabase.from('deliveries').insert({
    order_id: orderId,
    carrier,
    tracking_number: tracking ?? null,
    fee: fee > 0 ? fee : null,
  })
  if (deliveryError) return { error: deliveryError.message }

  const { error: orderError } = await supabase.from('orders')
    .update({ status: 'shipped' })
    .eq('id', orderId)
    .eq('seller_id', context.sellerId)
  if (orderError) return { error: orderError.message }

  await supabase.from('order_status_history').insert({
    order_id: orderId, status: 'shipped', changed_by: context.userId,
  })

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()
  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'delivery_created',
    entityType: 'order',
    entityId: orderId,
    description: `a expédié une commande via ${carrier}${tracking ? ` (${tracking})` : ''}`,
    metadata: { carrier, tracking },
  })

  revalidatePath('/deliveries')
  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidateTag('dashboard')
  return {}
}

export async function deleteDelivery(id: string): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }

  const supabase = await createServerClient()

  const { data: delivery } = await supabase
    .from('deliveries')
    .select('id, cod_collected, carrier, order:orders(id, status, seller_id)')
    .eq('id', id)
    .single()

  if (!delivery) return { error: 'Livraison introuvable' }

  const order = Array.isArray(delivery.order) ? delivery.order[0] : delivery.order as { id: string; status: string; seller_id: string } | null
  if (!order || order.seller_id !== context.sellerId) return { error: 'Non autorisé' }

  // Bloquer si COD déjà collecté — la trace comptable ne peut pas être effacée
  if (delivery.cod_collected) {
    return { error: 'Impossible de supprimer cette livraison : le COD a déjà été collecté. Marquez-la comme COD reversé avant de la supprimer.' }
  }

  const { error: deleteError } = await supabase.from('deliveries').delete().eq('id', id)
  if (deleteError) return { error: deleteError.message }

  // Remettre la commande en "Confirmée" si elle était en "Expédiée"
  if (order.status === 'shipped') {
    await supabase.from('orders').update({ status: 'confirmed' }).eq('id', order.id)
  }

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'delivery_deleted',
    entityType: 'delivery',
    entityId: id,
    description: `a supprimé une livraison ${delivery.carrier}${order.status === 'shipped' ? ' (commande remise en "Confirmée")' : ''}`,
  })

  revalidatePath('/deliveries')
  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidateTag('dashboard')
  return {}
}
