'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
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
  image_url?: string | null
  description?: string | null
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
    image_url: input.image_url ?? null,
    description: input.description ?? null,
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

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }

  const supabase = await createServerClient()

  const { count: activeCount } = await supabase.from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id)
    .eq('seller_id', context.sellerId)
    .in('status', ['new', 'confirmed', 'shipped'])
    .is('deleted_at', null)

  if (activeCount && activeCount > 0) {
    return { error: 'Ce produit a des commandes actives (nouvelles, confirmées ou expédiées) et ne peut pas être supprimé.' }
  }

  const { data: product } = await supabase.from('products')
    .select('name')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .single()

  const { error } = await supabase.from('products')
    .delete()
    .eq('id', id)
    .eq('seller_id', context.sellerId)
  if (error) return { error: error.message }

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
  return {}
}

export async function uploadProductImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }

  const file = formData.get('file') as File
  if (!file || !file.size) return { error: 'Aucun fichier fourni' }
  if (!file.type.startsWith('image/')) return { error: 'Le fichier doit être une image' }
  if (file.size > 5 * 1024 * 1024) return { error: "L'image ne doit pas dépasser 5 Mo" }

  const serviceClient = createServiceClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${context.sellerId}/${Date.now()}.${ext}`

  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await serviceClient.storage
    .from('product-images')
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = serviceClient.storage
    .from('product-images')
    .getPublicUrl(path)

  return { url: publicUrl }
}

export async function adjustStock(id: string, newStock: number, reason: string): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Non autorisé' }

  const supabase = await createServerClient()

  const { data: product } = await supabase.from('products')
    .select('stock, name')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .single()
  if (!product) return { error: 'Produit introuvable' }

  const { error } = await supabase.from('products')
    .update({ stock: newStock })
    .eq('id', id)
    .eq('seller_id', context.sellerId)
  if (error) return { error: error.message }

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'product_updated',
    entityType: 'product',
    entityId: id,
    description: `a ajusté le stock de "${product.name}" : ${product.stock} → ${newStock} (${reason})`,
    metadata: { oldStock: product.stock, newStock, reason },
  })

  revalidatePath('/catalog')
  revalidatePath(`/catalog/${id}`)
  return {}
}
