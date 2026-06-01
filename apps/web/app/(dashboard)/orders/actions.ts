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

  let customerId = input.customer_id

  if (!customerId) {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('seller_id', user.id)
      .eq('phone', input.customer_phone)
      .maybeSingle()

    if (existing) {
      customerId = existing.id
      await supabase.from('customers').update({
        name: input.customer_name,
        address: input.customer_address ?? null,
        city: input.customer_city ?? null,
      }).eq('id', customerId)
    } else {
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          seller_id: user.id,
          name: input.customer_name,
          phone: input.customer_phone,
          address: input.customer_address ?? null,
          city: input.customer_city ?? null,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      customerId = newCustomer.id
    }
  }

  const { error: orderError } = await supabase.from('orders').insert({
    seller_id: user.id,
    customer_id: customerId,
    product_id: input.product_id,
    variant: input.variant || null,
    quantity: input.quantity,
    cod_amount: input.cod_amount,
    notes: input.notes || null,
  })
  if (orderError) throw new Error(orderError.message)

  await supabase.rpc('decrement_stock', {
    product_id: input.product_id,
    qty: input.quantity,
  })

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
