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

  if (input.cod_collected === true) {
    const patch: Record<string, unknown> = {}
    if ('tracking_number' in input) patch.tracking_number = input.tracking_number
    if ('carrier_status' in input) patch.carrier_status = input.carrier_status
    if ('fee' in input) patch.fee = input.fee
    if ('cod_reversed' in input) patch.cod_reversed = input.cod_reversed

    if (Object.keys(patch).length > 0) {
      const { error: patchError } = await supabase.from('deliveries').update(patch).eq('id', id)
      if (patchError) throw new Error(patchError.message)
    }

    const { data: orderId, error: rpcError } = await supabase.rpc('mark_delivery_cod_collected', {
      p_seller_id: context.sellerId,
      p_user_id: context.userId,
      p_delivery_id: id,
    })

    if (rpcError) throw new Error(rpcError.message)

    const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()
    await logActivity({
      sellerId: context.sellerId,
      userId: context.userId,
      userName: seller?.name ?? context.userId,
      actionType: 'order_status_changed',
      entityType: 'order',
      entityId: typeof orderId === 'string' ? orderId : undefined,
      description: 'commande marquée comme livrée (COD collecté)',
    })

    revalidatePath('/deliveries')
    revalidatePath('/orders')
    revalidatePath('/dashboard')
    revalidateTag('dashboard')
    return
  }

  const patch: Record<string, unknown> = { ...input }

  if (input.cod_collected === false) {
    patch.delivered_at = null
    patch.cod_reversed = false
  }

  const { error } = await supabase.from('deliveries').update(patch).eq('id', id)
  if (error) throw new Error(error.message)

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

  const { error: shipError } = await supabase.rpc('create_delivery_from_order', {
    p_seller_id: context.sellerId,
    p_user_id: context.userId,
    p_order_id: orderId,
    p_carrier: carrier,
    p_tracking_number: tracking ?? null,
    p_fee: fee > 0 ? fee : null,
  })

  if (shipError) {
    if (shipError.message.includes('order_not_shippable')) {
      return { error: 'Cette commande ne peut pas être expédiée.' }
    }
    return { error: shipError.message }
  }

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
