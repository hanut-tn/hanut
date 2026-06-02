'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
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

  const isUpdate = !!input.id

  if (isUpdate) {
    const { error } = await supabase.from('products')
      .update(payload)
      .eq('id', input.id!)
      .eq('seller_id', context.sellerId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('products')
      .insert({ ...payload, seller_id: context.sellerId })
    if (error) throw new Error(error.message)
  }

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: isUpdate ? 'product_updated' : 'product_created',
    entityType: 'product',
    entityId: input.id,
    description: isUpdate
      ? `a modifié le produit ${input.name}`
      : `a ajouté le produit ${input.name}`,
    metadata: { price: input.price, stock: input.stock },
  })

  revalidatePath('/catalog')
}

export async function deleteProduct(id: string) {
  const context = await getUserContext()
  if (!context) throw new Error('Non autorisé')
  if (context.role === 'readonly') throw new Error('Action réservée aux admins et opérateurs')

  const supabase = await createServerClient()

  const { data: product } = await supabase
    .from('products')
    .select('name')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .single()

  const { error } = await supabase.from('products')
    .delete()
    .eq('id', id)
    .eq('seller_id', context.sellerId)
  if (error) throw new Error(error.message)

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'product_deleted',
    entityType: 'product',
    entityId: id,
    description: `a supprimé le produit ${product?.name ?? id}`,
  })

  revalidatePath('/catalog')
}
