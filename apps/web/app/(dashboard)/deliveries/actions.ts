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

export type DeliveryMutationResult = { error?: string }
type DeliveryContext = NonNullable<Awaited<ReturnType<typeof getUserContext>>>
type ServerSupabaseClient = Awaited<ReturnType<typeof createServerClient>>

function deliveryErrorMessage(message: string) {
  if (
    message.includes('idx_unique_active_delivery_per_order') ||
    message.toLowerCase().includes('duplicate key')
  ) {
    return 'Une livraison active existe déjà pour cette commande.'
  }
  return message
}

async function recordCodReversal(
  context: DeliveryContext,
  supabase: ServerSupabaseClient,
  deliveryId: string,
  amount: number,
  notes?: string
): Promise<DeliveryMutationResult> {
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Montant de reversement invalide.' }

  const { error } = await supabase.rpc('mark_delivery_cod_reversed', {
    p_delivery_id: deliveryId,
    p_seller_id: context.sellerId,
    p_amount: amount,
    p_notes: notes?.trim().slice(0, 2000) || null,
    p_reversed_by: context.userId,
  })

  if (error) {
    if (error.message.includes('UNAUTHORIZED')) return { error: 'Non autorisé.' }
    if (error.message.includes('INVALID_REVERSAL_AMOUNT')) return { error: 'Montant de reversement invalide.' }
    if (error.message.includes('COD_ALREADY_REVERSED')) return { error: 'Ce COD a déjà été reversé.' }
    if (error.message.includes('DELIVERY_NOT_FOUND_OR_COD_NOT_COLLECTED')) {
      return { error: 'Livraison introuvable ou COD non encore collecté.' }
    }
    return { error: error.message }
  }

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'delivery_cod_reversed',
    entityType: 'delivery',
    entityId: deliveryId,
    description: `a enregistré un reversement COD de ${amount} DT`,
    metadata: { amount, notes },
  })

  revalidatePath('/deliveries')
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

export async function createDelivery(input: CreateDeliveryInput): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }

  const supabase = await createServerClient()

  // Vérification 1 : la commande existe, appartient au vendeur et est dans un statut valide.
  // Statuts autorisés : 'confirmed' (flux normal via modal commandes) et 'shipped'
  // (flux manuel : commande déjà expédiée sans livraison associée).
  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', input.order_id)
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!order) {
    return { error: 'Commande introuvable.' }
  }

  if (order.status !== 'confirmed' && order.status !== 'shipped') {
    return {
      error: 'Impossible de créer une livraison — la commande doit être en statut "Confirmée" ou "Expédiée".',
    }
  }

  // Vérification 2 : absence de livraison active (cohérence avec contrainte UNIQUE DB partielle).
  const { data: existing } = await supabase
    .from('deliveries')
    .select('id')
    .eq('order_id', input.order_id)
    .eq('cod_collected', false)
    .maybeSingle()

  if (existing) {
    return { error: 'Une livraison active existe déjà pour cette commande.' }
  }

  if (order.status === 'confirmed') {
    const { error: shipError } = await supabase.rpc('create_delivery_from_order', {
      p_seller_id: context.sellerId,
      p_user_id: context.userId,
      p_order_id: input.order_id,
      p_carrier: input.carrier,
      p_tracking_number: input.tracking_number ?? null,
      p_fee: input.fee ?? null,
    })
    if (shipError) {
      if (shipError.message.includes('order_not_shippable')) {
        return { error: 'Cette commande ne peut pas être expédiée.' }
      }
      return { error: deliveryErrorMessage(shipError.message) }
    }
  } else {
    const { error } = await supabase.from('deliveries').insert({
      order_id: input.order_id,
      carrier: input.carrier,
      tracking_number: input.tracking_number || null,
      fee: input.fee ?? null,
    })
    if (error) return { error: deliveryErrorMessage(error.message) }
  }

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
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

export async function updateDelivery(
  id: string,
  input: UpdateDeliveryInput
): Promise<DeliveryMutationResult> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }

  const supabase = await createServerClient()

  // Compatibilité avec les anciens appels updateDelivery({ cod_reversed: true }) :
  // le reversement passe désormais toujours par la RPC auditée.
  if (input.cod_reversed === true) {
    const { data: delivery } = await supabase
      .from('deliveries')
      .select('order:orders(cod_amount)')
      .eq('id', id)
      .maybeSingle()

    const joinedOrder = Array.isArray(delivery?.order) ? delivery.order[0] : delivery?.order
    if (!joinedOrder) return { error: 'Livraison introuvable.' }
    return recordCodReversal(context, supabase, id, joinedOrder.cod_amount)
  }

  if (input.cod_collected === true) {
    // RPC en premier : si elle échoue, aucune modification partielle n'est appliquée.
    // Le patch des champs secondaires (tracking, fee) vient après —
    // une éventuelle erreur de patch laisse le COD marqué mais ces champs
    // restent modifiables séparément.
    const { data: orderId, error: rpcError } = await supabase.rpc('mark_delivery_cod_collected', {
      p_seller_id: context.sellerId,
      p_user_id: context.userId,
      p_delivery_id: id,
    })

    if (rpcError) return { error: deliveryErrorMessage(rpcError.message) }

    const patch: Record<string, unknown> = {}
    if ('tracking_number' in input) patch.tracking_number = input.tracking_number
    if ('carrier_status' in input) patch.carrier_status = input.carrier_status
    if ('fee' in input) patch.fee = input.fee
    if (Object.keys(patch).length > 0) {
      const { error: patchError } = await supabase.from('deliveries').update(patch).eq('id', id)
      if (patchError) return { error: deliveryErrorMessage(patchError.message) }
    }

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
    revalidateTag(`dashboard-${context.sellerId}`)
    return {}
  }

  // Lire l'état actuel pour bloquer les retours arrière comptables.
  // La RLS garantit qu'on ne lit que les livraisons du seller connecté.
  const { data: currentDelivery } = await supabase
    .from('deliveries')
    .select('cod_collected, cod_reversed')
    .eq('id', id)
    .maybeSingle()

  if (!currentDelivery) return { error: 'Livraison introuvable.' }

  if (currentDelivery.cod_collected === true && input.cod_collected === false) {
    return { error: "Impossible d'annuler un COD déjà collecté. Contactez le support si c'est une erreur." }
  }

  if (currentDelivery.cod_reversed === true && input.cod_reversed === false) {
    return { error: "Impossible d'annuler un COD déjà reversé." }
  }

  const patch: Record<string, unknown> = { ...input }

  if (input.cod_collected === false) {
    patch.delivered_at = null
    patch.cod_reversed = false
  }

  const { error } = await supabase.from('deliveries').update(patch).eq('id', id)
  if (error) return { error: deliveryErrorMessage(error.message) }

  revalidatePath('/deliveries')
  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
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
    return { error: deliveryErrorMessage(shipError.message) }
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
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

// Enregistre un reversement COD avec montant et trace d'audit.
// Remplace le toggle cod_reversed direct du legacy updateDelivery pour les nouveaux reversements.
export async function markCodReversed(
  deliveryId: string,
  amount: number,
  notes?: string
): Promise<DeliveryMutationResult> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé.' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs.' }
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Montant de reversement invalide.' }

  const supabase = await createServerClient()
  return recordCodReversal(context, supabase, deliveryId, amount, notes)
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
    const { error: statusError } = await supabase.rpc('update_order_status', {
      p_seller_id: context.sellerId,
      p_order_id: order.id,
      p_new_status: 'confirmed',
      p_changed_by: context.userId,
    })
    if (statusError) return { error: statusError.message }
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
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}
