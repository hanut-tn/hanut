'use server'

import * as Sentry from '@sentry/nextjs'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { OrderStatus } from '@hanut/types'
import { DELETABLE_STATUSES, ORDER_STATUS_LABELS, PLAN_LIMITS } from '@/lib/constants'
import { getMonthlyOrderCount } from '@/lib/get-context'
import { isValidTransition } from '@/lib/order-transitions'
import { requireActive } from '@/lib/assert-active'
import { HanutAddressFieldsSchema } from '@/lib/address'

export type CreateOrderInput = {
  customer_id?: string
  customer_name: string
  customer_phone: string
  customer_governorate?: string
  customer_city?: string
  customer_delegation?: string
  customer_address?: string
  customer_landmark?: string
  customer_postal_code?: string
  delivery_notes?: string
  product_id: string
  variant?: string
  quantity: number
  cod_amount: number
  notes?: string
}

export type OrderMutationResult = { error?: string }

export async function createOrder(input: CreateOrderInput): Promise<OrderMutationResult> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  if (context.plan === 'starter') {
    const count = await getMonthlyOrderCount(context.sellerId)
    if (count >= PLAN_LIMITS.starter.ordersPerMonth) {
      return { error: 'LIMIT_REACHED' }
    }
  }

  const supabase = await createServerClient()
  const parsedAddress = HanutAddressFieldsSchema.safeParse({
    customer_governorate: input.customer_governorate,
    customer_city: input.customer_city,
    customer_delegation: input.customer_delegation,
    customer_address: input.customer_address,
    customer_landmark: input.customer_landmark,
    customer_postal_code: input.customer_postal_code,
    delivery_notes: input.delivery_notes,
  })
  if (!parsedAddress.success) {
    return { error: parsedAddress.error.issues[0]?.message ?? 'Adresse invalide.' }
  }
  const address = parsedAddress.data

  const { data: product } = await supabase
    .from('products')
    .select('name')
    .eq('id', input.product_id)
    .eq('seller_id', context.sellerId)
    .single()

  const { error } = await supabase.rpc('create_order_with_stock', {
    p_seller_id: context.sellerId,
    p_product_id: input.product_id,
    p_quantity: input.quantity,
    p_customer_name: input.customer_name,
    p_customer_phone: input.customer_phone,
    p_customer_address: address.customer_address,
    p_customer_city: address.customer_city,
    p_customer_id: input.customer_id ?? null,
    p_variant: input.variant ?? null,
    p_cod_amount: input.cod_amount,
    p_notes: input.notes ?? null,
    p_status: 'new',
    p_changed_by: context.userId,
    p_customer_governorate: address.customer_governorate,
    p_customer_delegation: address.customer_delegation ?? null,
    p_customer_landmark: address.customer_landmark,
    p_customer_postal_code: address.customer_postal_code ?? null,
    p_delivery_notes: address.delivery_notes ?? null,
  })
  if (error) {
    if (error.message.includes('LIMIT_REACHED')) return { error: 'LIMIT_REACHED' }
    if (error.message.includes('SHOP_INACTIVE')) {
      return { error: 'Votre abonnement ou votre démo a expiré.' }
    }
    Sentry.captureException(new Error(error.message), {
      tags: { module: 'orders' },
      extra: { sellerId: context.sellerId },
    })
    return { error: error.message }
  }


  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'order_created',
    entityType: 'order',
    description: `a créé une commande pour ${input.customer_name} (${input.cod_amount} DT)`,
    metadata: { product: product?.name, quantity: input.quantity, governorate: address.customer_governorate },
  })

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (context.role === 'readonly') throw new Error('Action réservée aux admins et opérateurs')
  const activeCheck = requireActive(context)
  if (activeCheck) throw new Error(activeCheck.error)
  if (status === 'cancelled') {
    throw new Error('Utilisez l’action d’annulation pour restaurer le stock correctement.')
  }

  const supabase = await createServerClient()

  const { data: currentOrder, error: currentOrderError } = await supabase
    .from('orders')
    .select('status')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)
    .single()

  if (currentOrderError || !currentOrder) {
    if (currentOrderError?.code === 'PGRST116') throw new Error('Commande introuvable.')
    throw new Error(currentOrderError?.message ?? 'Commande introuvable.')
  }

  if (!isValidTransition(currentOrder.status, status)) {
    throw new Error('Cette transition de statut n\'est pas autorisée.')
  }

  const { error } = await supabase.rpc('update_order_status', {
    p_seller_id: context.sellerId,
    p_order_id: id,
    p_new_status: status,
    p_changed_by: context.userId,
  })
  if (error) {
    if (error.message.includes('ORDER_NOT_FOUND')) throw new Error('Commande introuvable.')
    if (error.message.includes('INVALID_TRANSITION')) throw new Error('Cette transition de statut n\'est pas autorisée.')
    throw new Error(error.message)
  }


  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'order_status_changed',
    entityType: 'order',
    entityId: id,
    description: `a changé le statut d'une commande en ${ORDER_STATUS_LABELS[status]}`,
  })

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
}

export async function confirmPendingOrder(id: string) {
  return updateOrderStatus(id, 'new')
}

export async function cancelPendingOrder(id: string) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (context.role === 'readonly') throw new Error('Action réservée aux admins et opérateurs')
  const activeCheck = requireActive(context)
  if (activeCheck) throw new Error(activeCheck.error)

  const supabase = await createServerClient()

  const { error } = await supabase.rpc('cancel_pending_order_with_stock', {
    p_seller_id: context.sellerId,
    p_order_id: id,
    p_changed_by: context.userId,
  })
  if (error) throw new Error(error.message)


  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'order_status_changed',
    entityType: 'order',
    entityId: id,
    description: `a annulé une commande en attente (statut → Annulée)`,
  })

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
}

// Annuler une commande en statut 'pending', 'new' ou 'confirmed'.
// Restaure le stock et passe le statut en 'cancelled'.
export async function cancelOrder(id: string): Promise<OrderMutationResult> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const supabase = await createServerClient()

  const { error } = await supabase.rpc('cancel_order_with_stock', {
    p_seller_id:  context.sellerId,
    p_order_id:   id,
    p_changed_by: context.userId,
  })

  if (error) {
    if (error.message.includes('ORDER_NOT_FOUND')) return { error: 'Commande introuvable.' }
    if (error.message.includes('CANNOT_CANCEL_STATUS')) {
      const status = error.message.split(':')[1] ?? ''
      return { error: `Impossible d'annuler une commande ${status}.` }
    }
    return { error: error.message }
  }


  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'order_status_changed',
    entityType: 'order',
    entityId: id,
    description: 'a annulé une commande (statut → Annulée)',
  })

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

// Soft-delete : déplace la commande en corbeille
export async function deleteOrder(id: string): Promise<OrderMutationResult> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role !== 'admin') return { error: 'Seuls les admins peuvent supprimer des commandes' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const supabase = await createServerClient()

  const { data: order } = await supabase
    .from('orders')
    .select('status, cod_amount, product_id, quantity, customer:customers(name)')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)
    .single()

  if (!order) return { error: 'Commande introuvable' }

  if (order.status === 'delivered' || order.status === 'returned' || order.status === 'cancelled') {
    // Starter : bloquer pour éviter de libérer du quota mensuel via suppression.
    // Pro/Business : pas de limite → autoriser le nettoyage des commandes résolues.
    if (context.plan === 'starter') {
      return { error: 'CANNOT_DELETE' }
    }
  } else if (order.status === 'shipped') {
    return { error: 'Une commande expédiée ne peut pas être supprimée. Attendez la livraison ou le retour.' }
  } else if (!DELETABLE_STATUSES.includes(order.status as OrderStatus)) {
    return { error: 'Une commande expédiée ne peut pas être supprimée. Attendez la livraison ou le retour.' }
  }

  const { error } = await supabase.rpc('soft_delete_order_with_stock', {
    p_seller_id: context.sellerId,
    p_order_id: id,
    p_archived_by: context.userId,
  })
  if (error) return { error: error.message }

  const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'order_deleted',
    entityType: 'order',
    entityId: id,
    description: `a déplacé une commande vers la corbeille${customer?.name ? ` (${customer.name}, ${order.cod_amount} DT)` : ''}`,
  })

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

// Restaurer une commande depuis la corbeille
export async function restoreOrder(id: string): Promise<OrderMutationResult> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role !== 'admin') return { error: 'Seuls les admins peuvent restaurer des commandes' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const supabase = await createServerClient()

  const { error } = await supabase.rpc('restore_trashed_order_with_stock', {
    p_seller_id: context.sellerId,
    p_order_id: id,
    p_restored_by: context.userId,
  })
  if (error) return { error: error.message }


  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'order_restored',
    entityType: 'order',
    entityId: id,
    description: 'a restauré une commande depuis la corbeille',
  })

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

// Suppression définitive depuis la corbeille
export async function permanentlyDeleteOrder(id: string): Promise<OrderMutationResult> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role !== 'admin') return { error: 'Seuls les admins peuvent supprimer définitivement des commandes' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const supabase = await createServerClient()

  // S'assurer que la commande est bien en corbeille
  const { data: order } = await supabase
    .from('orders')
    .select('id, cod_amount, customer:customers(name)')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .not('deleted_at', 'is', null)
    .single()

  if (!order) return { error: 'Commande introuvable dans la corbeille' }

  const { error } = await supabase.from('orders')
    .delete()
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .not('deleted_at', 'is', null)
  if (error) return { error: error.message }

  const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'order_permanently_deleted',
    entityType: 'order',
    entityId: id,
    description: `a supprimé définitivement une commande${customer?.name ? ` (${customer.name}, ${order.cod_amount} DT)` : ''}`,
  })

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}
