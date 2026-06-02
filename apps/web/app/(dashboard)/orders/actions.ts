'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { revalidatePath } from 'next/cache'
import type { OrderStatus } from '@hanut/types'

export type CreateOrderInput = {
  customer_id?: string
  customer_name: string
  customer_phone: string
  customer_address?: string
  customer_city?: string
  product_id: string
  variant?: string
  quantity: number
  cod_amount: number
  notes?: string
}

const DELETABLE_STATUSES: OrderStatus[] = ['pending', 'new', 'returned']

export async function createOrder(input: CreateOrderInput) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (context.role === 'readonly') throw new Error('Action réservée aux admins et opérateurs')

  const supabase = await createServerClient()

  const { data: product } = await supabase
    .from('products')
    .select('name')
    .eq('id', input.product_id)
    .single()

  const { error } = await supabase.rpc('create_order_with_stock', {
    p_seller_id: context.sellerId,
    p_product_id: input.product_id,
    p_quantity: input.quantity,
    p_customer_name: input.customer_name,
    p_customer_phone: input.customer_phone,
    p_customer_address: input.customer_address ?? null,
    p_customer_city: input.customer_city ?? null,
    p_customer_id: input.customer_id ?? null,
    p_variant: input.variant ?? null,
    p_cod_amount: input.cod_amount,
    p_notes: input.notes ?? null,
    p_status: 'new',
  })
  if (error) throw new Error(error.message)

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'order_created',
    entityType: 'order',
    description: `a créé une commande pour ${input.customer_name} (${input.cod_amount} DT)`,
    metadata: { product: product?.name, quantity: input.quantity },
  })

  revalidatePath('/orders')
  revalidatePath('/dashboard')
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (context.role === 'readonly') throw new Error('Action réservée aux admins et opérateurs')

  const supabase = await createServerClient()

  const { error } = await supabase.from('orders')
    .update({ status })
    .eq('id', id)
    .eq('seller_id', context.sellerId)
  if (error) throw new Error(error.message)

  const STATUS_LABELS: Record<string, string> = {
    new: 'Nouvelle', confirmed: 'Confirmée', shipped: 'Expédiée',
    delivered: 'Livrée', returned: 'Retournée', pending: 'En attente',
  }
  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'order_status_changed',
    entityType: 'order',
    entityId: id,
    description: `a changé le statut d'une commande en ${STATUS_LABELS[status] ?? status}`,
  })

  revalidatePath('/orders')
  revalidatePath('/dashboard')
}

export async function confirmPendingOrder(id: string) {
  return updateOrderStatus(id, 'new')
}

export async function cancelPendingOrder(id: string) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (context.role === 'readonly') throw new Error('Action réservée aux admins et opérateurs')

  const supabase = await createServerClient()

  const { data: order } = await supabase
    .from('orders')
    .select('product_id, quantity, status')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .single()

  if (!order) throw new Error('Commande introuvable')
  if (order.status !== 'pending') throw new Error('Seules les commandes en attente peuvent être annulées ici')

  const { data: product } = await supabase
    .from('products')
    .select('stock')
    .eq('id', order.product_id)
    .single()

  if (product) {
    await supabase.from('products')
      .update({ stock: product.stock + order.quantity })
      .eq('id', order.product_id)
      .eq('seller_id', context.sellerId)
  }

  const { error } = await supabase.from('orders')
    .update({ status: 'returned' })
    .eq('id', id)
    .eq('seller_id', context.sellerId)
  if (error) throw new Error(error.message)

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'order_status_changed',
    entityType: 'order',
    entityId: id,
    description: `a annulé une commande en attente (statut → Retournée)`,
  })

  revalidatePath('/orders')
  revalidatePath('/dashboard')
}

type OrderMutationResult = { error?: string }

// Soft-delete : déplace la commande en corbeille
export async function deleteOrder(id: string): Promise<OrderMutationResult> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role !== 'admin') return { error: 'Seuls les admins peuvent supprimer des commandes' }

  const supabase = await createServerClient()

  const { data: order } = await supabase
    .from('orders')
    .select('status, cod_amount, customer:customers(name)')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)
    .single()

  if (!order) return { error: 'Commande introuvable' }

  if (!DELETABLE_STATUSES.includes(order.status as OrderStatus)) {
    return { error: 'Cette commande ne peut pas être supprimée car elle est en cours de traitement.' }
  }

  const { error } = await supabase.from('orders')
    .update({ deleted_at: new Date().toISOString(), archived_by: context.userId })
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)
  if (error) return { error: error.message }

  const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer
  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'order_deleted',
    entityType: 'order',
    entityId: id,
    description: `a déplacé une commande vers la corbeille${customer?.name ? ` (${customer.name}, ${order.cod_amount} DT)` : ''}`,
  })

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  return {}
}

// Restaurer une commande depuis la corbeille
export async function restoreOrder(id: string): Promise<OrderMutationResult> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role !== 'admin') return { error: 'Seuls les admins peuvent restaurer des commandes' }

  const supabase = await createServerClient()

  const { data: order } = await supabase
    .from('orders')
    .select('deleted_at')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .not('deleted_at', 'is', null)
    .single()

  if (!order) return { error: 'Commande introuvable dans la corbeille' }

  const deletedAt = new Date(order.deleted_at as string)
  const restoreDeadline = deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000
  if (Date.now() > restoreDeadline) {
    return { error: 'Cette commande ne peut plus être restaurée après 30 jours dans la corbeille.' }
  }

  const { error } = await supabase.from('orders')
    .update({ deleted_at: null, archived_by: null })
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .not('deleted_at', 'is', null)
  if (error) return { error: error.message }

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'order_restored',
    entityType: 'order',
    entityId: id,
    description: 'a restauré une commande depuis la corbeille',
  })

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  return {}
}

// Suppression définitive depuis la corbeille
export async function permanentlyDeleteOrder(id: string): Promise<OrderMutationResult> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role !== 'admin') return { error: 'Seuls les admins peuvent supprimer définitivement des commandes' }

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
  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'order_permanently_deleted',
    entityType: 'order',
    entityId: id,
    description: `a supprimé définitivement une commande${customer?.name ? ` (${customer.name}, ${order.cod_amount} DT)` : ''}`,
  })

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  return {}
}
