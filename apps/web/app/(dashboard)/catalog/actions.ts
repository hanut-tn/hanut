'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { revalidatePath } from 'next/cache'

export type ProductVariant = { size?: string; color?: string; qty: number }

export type ProductInput = {
  id?: string
  name: string
  price: number
  cost?: number | null
  stock: number
  low_stock_alert: number
  variants: ProductVariant[]
}

export async function upsertProduct(input: ProductInput) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (context.role === 'readonly') throw new Error('Action réservée aux admins et opérateurs')

  const supabase = await createServerClient()

  const payload = {
    name: input.name,
    price: input.price,
    cost: input.cost ?? null,
    stock: input.stock,
    low_stock_alert: input.low_stock_alert,
    variants: input.variants,
  }

  if (input.id) {
    const { error } = await supabase.from('products')
      .update(payload)
      .eq('id', input.id)
      .eq('seller_id', context.sellerId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('products')
      .insert({ ...payload, seller_id: context.sellerId })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/catalog')
}

export async function deleteProduct(id: string) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (context.role === 'readonly') throw new Error('Action réservée aux admins et opérateurs')

  const supabase = await createServerClient()

  const { error } = await supabase.from('products')
    .delete()
    .eq('id', id)
    .eq('seller_id', context.sellerId)
  if (error) throw new Error(error.message)

  revalidatePath('/catalog')
}
