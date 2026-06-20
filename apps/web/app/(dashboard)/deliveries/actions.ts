'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { CarrierName, DeliveryType } from '@hanut/types'
import { requireActive } from '@/lib/assert-active'
import { CARRIER_NAMES } from '@/lib/constants'

export type CreateDeliveryInput = {
  order_id: string
  delivery_type: DeliveryType
  carrier?: CarrierName
  tracking_number?: string
  fee?: number
  vendor_note?: string
}

export type UpdateDeliveryInput = {
  tracking_number?: string | null
  carrier_status?: string | null
  fee?: number | null
  vendor_note?: string | null
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
  if (message.includes('INVALID_DELIVERY_TYPE')) return 'Type de livraison invalide.'
  if (message.includes('INVALID_CARRIER')) return 'Transporteur invalide.'
  if (message.includes('INVALID_DELIVERY_FEE')) return 'Frais de livraison invalides.'
  if (message.includes('TRACKING_NUMBER_TOO_LONG')) return 'Le numéro de suivi est trop long.'
  if (message.includes('VENDOR_NOTE_TOO_LONG')) return 'Le message au client est trop long.'
  if (message.includes('SELF_DELIVERY_NOT_FOUND')) return 'Livraison personnelle introuvable.'
  return message
}

function validateDeliveryFields(
  deliveryType: DeliveryType,
  carrier: string | undefined,
  tracking: string | undefined,
  fee: number | undefined,
  vendorNote?: string,
):
  | {
      carrier: CarrierName | undefined
      tracking: string | undefined
      fee: number | null
      vendorNote: string | undefined
      error?: never
    }
  | {
      error: string
      carrier?: never
      tracking?: never
      fee?: never
      vendorNote?: never
    } {
  if (deliveryType !== 'self' && deliveryType !== 'carrier') {
    return { error: 'Type de livraison invalide.' }
  }
  if (deliveryType === 'carrier') {
    if (!carrier || !CARRIER_NAMES.includes(carrier as CarrierName)) {
      return { error: 'Transporteur invalide.' }
    }
  }
  if (fee !== undefined && (!Number.isFinite(fee) || fee < 0 || fee > 100000)) {
    return { error: 'Frais de livraison invalides.' }
  }

  const normalizedTracking = tracking?.trim()
  if (normalizedTracking && normalizedTracking.length > 200) {
    return { error: 'Le numéro de suivi est trop long.' }
  }

  const normalizedVendorNote = vendorNote?.trim()
  if (normalizedVendorNote && normalizedVendorNote.length > 1000) {
    return { error: 'Le message au client est trop long.' }
  }

  return {
    carrier: deliveryType === 'carrier' ? (carrier as CarrierName) : undefined,
    tracking: deliveryType === 'carrier' ? normalizedTracking || undefined : undefined,
    fee: deliveryType === 'carrier' && fee && fee > 0 ? fee : null,
    vendorNote: deliveryType === 'self' ? normalizedVendorNote || undefined : undefined,
  }
}

async function recordCodReversal(
  context: DeliveryContext,
  supabase: ServerSupabaseClient,
  deliveryId: string,
  amount: number,
  notes?: string
): Promise<DeliveryMutationResult> {
  if (context.role !== 'admin') return { error: 'Action réservée aux admins.' }
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


  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
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
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck
  const validated = validateDeliveryFields(
    input.delivery_type,
    input.carrier,
    input.tracking_number,
    input.fee,
    input.vendor_note,
  )
  if (validated.error) return { error: validated.error }

  const supabase = await createServerClient()

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

  if (order.status !== 'confirmed') {
    return {
      error: 'Impossible de créer une livraison — la commande doit être en statut "Confirmée". Supprimez la livraison existante pour la recréer.',
    }
  }

  const { data: existing } = await supabase
    .from('deliveries')
    .select('id')
    .eq('order_id', input.order_id)
    .eq('cod_collected', false)
    .maybeSingle()

  if (existing) {
    return { error: 'Une livraison active existe déjà pour cette commande.' }
  }

  const { error: shipError } = await supabase.rpc('create_delivery_from_order', {
    p_seller_id: context.sellerId,
    p_user_id: context.userId,
    p_order_id: input.order_id,
    p_delivery_type: input.delivery_type,
    p_carrier: validated.carrier ?? null,
    p_tracking_number: validated.tracking ?? null,
    p_fee: validated.fee,
    p_vendor_note: validated.vendorNote ?? null,
  })
  if (shipError) {
    if (shipError.message.includes('order_not_shippable')) {
      return { error: 'Cette commande ne peut pas être expédiée.' }
    }
    return { error: deliveryErrorMessage(shipError.message) }
  }


  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'delivery_created',
    entityType: 'delivery',
    description: input.delivery_type === 'self'
      ? 'a créé une livraison personnelle'
      : `a créé une livraison via ${validated.carrier}`,
    metadata: { delivery_type: input.delivery_type, carrier: validated.carrier, tracking: validated.tracking },
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
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  if (input.fee !== undefined && input.fee !== null) {
    if (!Number.isFinite(input.fee) || input.fee < 0 || input.fee > 100000) {
      return { error: 'Frais de livraison invalides.' }
    }
  }
  const normalizedTracking = input.tracking_number?.trim() || null
  if (normalizedTracking && normalizedTracking.length > 200) {
    return { error: 'Le numéro de suivi est trop long.' }
  }
  const normalizedVendorNote = input.vendor_note?.trim() || null
  if (normalizedVendorNote && normalizedVendorNote.length > 1000) {
    return { error: 'Le message au client est trop long.' }
  }
  const normalizedInput: UpdateDeliveryInput = {
    ...input,
    ...('tracking_number' in input ? { tracking_number: normalizedTracking } : {}),
    ...('vendor_note' in input ? { vendor_note: normalizedVendorNote } : {}),
  }

  if (normalizedInput.cod_reversed === true && context.role !== 'admin') {
    return { error: 'Action réservée aux admins.' }
  }

  const supabase = await createServerClient()

  if (normalizedInput.cod_reversed === true) {
    const { data: delivery } = await supabase
      .from('deliveries')
      .select('order:orders(cod_amount)')
      .eq('id', id)
      .maybeSingle()

    const joinedOrder = Array.isArray(delivery?.order) ? delivery.order[0] : delivery?.order
    if (!joinedOrder) return { error: 'Livraison introuvable.' }
    return recordCodReversal(context, supabase, id, joinedOrder.cod_amount)
  }

  if (normalizedInput.cod_collected === true) {
    const { data: orderId, error: rpcError } = await supabase.rpc('mark_delivery_cod_collected', {
      p_seller_id: context.sellerId,
      p_user_id: context.userId,
      p_delivery_id: id,
    })

    if (rpcError) return { error: deliveryErrorMessage(rpcError.message) }

    const patch: Record<string, unknown> = {}
    if ('tracking_number' in normalizedInput) patch.tracking_number = normalizedInput.tracking_number
    if ('carrier_status' in normalizedInput) patch.carrier_status = normalizedInput.carrier_status
    if ('fee' in normalizedInput) patch.fee = normalizedInput.fee
    if ('vendor_note' in normalizedInput) patch.vendor_note = normalizedInput.vendor_note
    if (Object.keys(patch).length > 0) {
      const { error: patchError } = await supabase.from('deliveries').update(patch).eq('id', id)
      if (patchError) return { error: deliveryErrorMessage(patchError.message) }
    }

    await logActivity({
      sellerId: context.sellerId,
      userId: context.userId,
      userName: context.userName,
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

  const { data: currentDelivery } = await supabase
    .from('deliveries')
    .select('cod_collected, cod_reversed')
    .eq('id', id)
    .maybeSingle()

  if (!currentDelivery) return { error: 'Livraison introuvable.' }

  if (currentDelivery.cod_collected === true && normalizedInput.cod_collected === false) {
    return { error: "Impossible d'annuler un COD déjà collecté. Contactez le support si c'est une erreur." }
  }

  if (currentDelivery.cod_reversed === true && normalizedInput.cod_reversed === false) {
    return { error: "Impossible d'annuler un COD déjà reversé." }
  }

  const patch: Record<string, unknown> = { ...normalizedInput }

  if (normalizedInput.cod_collected === false) {
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
  deliveryType: DeliveryType,
  carrier: string | undefined,
  tracking: string | undefined,
  fee: number,
  vendorNote?: string,
): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck
  const validated = validateDeliveryFields(deliveryType, carrier, tracking, fee, vendorNote)
  if (validated.error) return { error: validated.error }

  const supabase = await createServerClient()

  const { error: shipError } = await supabase.rpc('create_delivery_from_order', {
    p_seller_id: context.sellerId,
    p_user_id: context.userId,
    p_order_id: orderId,
    p_delivery_type: deliveryType,
    p_carrier: validated.carrier ?? null,
    p_tracking_number: validated.tracking ?? null,
    p_fee: validated.fee,
    p_vendor_note: validated.vendorNote ?? null,
  })

  if (shipError) {
    if (shipError.message.includes('order_not_shippable')) {
      return { error: 'Cette commande ne peut pas être expédiée.' }
    }
    return { error: deliveryErrorMessage(shipError.message) }
  }

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'delivery_created',
    entityType: 'order',
    entityId: orderId,
    description: deliveryType === 'self'
      ? 'a expédié une commande en livraison personnelle'
      : `a expédié une commande via ${validated.carrier}${validated.tracking ? ` (${validated.tracking})` : ''}`,
    metadata: { delivery_type: deliveryType, carrier: validated.carrier, tracking: validated.tracking },
  })

  revalidatePath('/deliveries')
  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

export async function markSelfDeliveryComplete(deliveryId: string): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const supabase = await createServerClient()
  const { data: orderId, error } = await supabase.rpc('mark_self_delivery_complete', {
    p_seller_id: context.sellerId,
    p_user_id: context.userId,
    p_delivery_id: deliveryId,
  })
  if (error) return { error: deliveryErrorMessage(error.message) }


  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'order_status_changed',
    entityType: 'order',
    entityId: typeof orderId === 'string' ? orderId : undefined,
    description: 'livraison personnelle terminée et COD encaissé',
  })

  revalidatePath('/deliveries')
  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

export async function markCodReversed(
  deliveryId: string,
  amount: number,
  notes?: string
): Promise<DeliveryMutationResult> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé.' }
  if (context.role !== 'admin') return { error: 'Action réservée aux admins.' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Montant de reversement invalide.' }

  const supabase = await createServerClient()
  return recordCodReversal(context, supabase, deliveryId, amount, notes)
}

export async function deleteDelivery(id: string): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const supabase = await createServerClient()

  const { data: delivery } = await supabase
    .from('deliveries')
    .select('id, cod_collected, carrier, delivery_type, order:orders(id, status, seller_id)')
    .eq('id', id)
    .single()

  if (!delivery) return { error: 'Livraison introuvable' }

  const order = Array.isArray(delivery.order) ? delivery.order[0] : delivery.order as { id: string; status: string; seller_id: string } | null
  if (!order || order.seller_id !== context.sellerId) return { error: 'Non autorisé' }

  if (delivery.cod_collected) {
    return { error: 'Impossible de supprimer cette livraison : le COD a déjà été collecté. Marquez-la comme COD reversé avant de la supprimer.' }
  }

  const { error: deleteError } = await supabase.from('deliveries').delete().eq('id', id)
  if (deleteError) return { error: deleteError.message }

  if (order.status === 'shipped') {
    const { error: statusError } = await supabase.rpc('update_order_status', {
      p_seller_id: context.sellerId,
      p_order_id: order.id,
      p_new_status: 'confirmed',
      p_changed_by: context.userId,
    })
    if (statusError) return { error: statusError.message }
  }


  const deliveryLabel = delivery.delivery_type === 'self'
    ? 'personnelle'
    : (delivery.carrier ?? '')

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'delivery_deleted',
    entityType: 'delivery',
    entityId: id,
    description: `a supprimé une livraison ${deliveryLabel}${order.status === 'shipped' ? ' (commande remise en "Confirmée")' : ''}`,
  })

  revalidatePath('/deliveries')
  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}
