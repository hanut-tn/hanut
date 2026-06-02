'use server'

import { createServerClient } from '@/lib/supabase/server'
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

export async function createOrder(input: CreateOrderInput) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const { error } = await supabase.rpc('create_order_with_stock', {
    p_seller_id: user.id,
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

  revalidatePath('/orders')
  revalidatePath('/dashboard')
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const { error } = await supabase.from('orders')
    .update({ status })
    .eq('id', id)
    .eq('seller_id', user.id)
  if (error) throw new Error(error.message)

  revalidatePath('/orders')
  revalidatePath('/dashboard')
}

export async function confirmPendingOrder(id: string) {
  return updateOrderStatus(id, 'new')
}

export async function cancelPendingOrder(id: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const { data: order } = await supabase
    .from('orders')
    .select('product_id, quantity, status')
    .eq('id', id)
    .eq('seller_id', user.id)
    .single()

  if (!order) throw new Error('Commande introuvable')
  if (order.status !== 'pending') throw new Error('Seules les commandes en attente peuvent être annulées ici')

  // Restore stock
  const { data: product } = await supabase
    .from('products')
    .select('stock')
    .eq('id', order.product_id)
    .single()

  if (product) {
    await supabase.from('products')
      .update({ stock: product.stock + order.quantity })
      .eq('id', order.product_id)
  }

  const { error } = await supabase.from('orders')
    .update({ status: 'returned' })
    .eq('id', id)
    .eq('seller_id', user.id)
  if (error) throw new Error(error.message)

  revalidatePath('/orders')
  revalidatePath('/dashboard')
}

export async function deleteOrder(id: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autorisé')

  const { error } = await supabase.from('orders')
    .delete()
    .eq('id', id)
    .eq('seller_id', user.id)
  if (error) throw new Error(error.message)

  revalidatePath('/orders')
  revalidatePath('/dashboard')
}
