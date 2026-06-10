'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getVariantLabel, sumVariantStock } from '@/lib/variants'

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

export async function upsertProduct(input: ProductInput): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }

  const supabase = await createServerClient()

  const payload = {
    name: input.name,
    price: input.price,
    cost: input.cost ?? null,
    stock: input.variants.length > 0 ? sumVariantStock(input.variants) : input.stock,
    low_stock_alert: input.low_stock_alert,
    variants: input.variants,
    image_url: input.image_url ?? null,
    description: input.description ?? null,
  }

  const isUpdate = !!input.id
  let productId = input.id

  if (isUpdate) {
    const { error } = await supabase.from('products')
      .update(payload)
      .eq('id', input.id!)
      .eq('seller_id', context.sellerId)
    if (error) return { error: error.message }
  } else {
    const { data, error } = await supabase.from('products')
      .insert({ ...payload, seller_id: context.sellerId })
      .select('id')
      .single()
    if (error) return { error: error.message }
    productId = data.id
  }

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: isUpdate ? 'product_updated' : 'product_created',
    entityType: 'product',
    entityId: productId,
    description: isUpdate
      ? `a modifié le produit ${input.name}`
      : `a ajouté le produit ${input.name}`,
    metadata: { price: input.price, stock: input.stock },
  })

  revalidatePath('/catalog')
  if (productId) revalidatePath(`/catalog/${productId}`)
  revalidateTag('dashboard')
  return {}
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

  const { count: linkedOrdersCount } = await supabase.from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id)
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)

  if (linkedOrdersCount && linkedOrdersCount > 0) {
    return { error: 'Ce produit est lié à des commandes existantes et ne peut pas être supprimé définitivement.' }
  }

  // Bloquer si commandes en corbeille (FK constraint DB)
  const { count: trashedCount } = await supabase.from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id)
    .eq('seller_id', context.sellerId)
    .not('deleted_at', 'is', null)

  if (trashedCount && trashedCount > 0) {
    return { error: `Ce produit a ${trashedCount} commande${trashedCount > 1 ? 's' : ''} dans la corbeille. Videz la corbeille d'abord avant de supprimer ce produit.` }
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
  revalidateTag('dashboard')
  return {}
}

export async function uploadProductImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }

  const file = formData.get('file') as File
  if (!file || !file.size) return { error: 'Aucun fichier fourni' }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Format non autorisé. Utilisez JPG, PNG, WebP ou HEIC uniquement.' }
  }
  const ext = (file.name.split('.').pop() ?? '').toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { error: 'Extension non autorisée. Utilisez .jpg, .png, .webp, .heic ou .heif uniquement.' }
  }
  if (file.size > 5 * 1024 * 1024) return { error: "L'image ne doit pas dépasser 5 Mo" }

  const serviceClient = createServiceClient()
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

export type StockAdjustmentInput = {
  type: 'restock' | 'correction' | 'return' | 'loss'
  quantity: number
  unitCost?: number | null
  costUpdateMode?: 'wac' | 'new' | 'keep'
  supplier?: string | null
  notes?: string | null
  variantAdjustments?: { label: string; value: number }[]
}

export async function adjustStock(id: string, input: StockAdjustmentInput): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }

  const supabase = await createServerClient()

  const { data: product } = await supabase.from('products')
    .select('stock, cost, name, variants')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .single()
  if (!product) return { error: 'Produit introuvable' }

  type Variant = { size?: string; color?: string; qty: number }
  const variants = (product.variants ?? []) as Variant[]
  const hasVariants = variants.length > 0

  if (!Number.isInteger(input.quantity) || input.quantity < 0) return { error: 'Quantité invalide' }
  if (input.unitCost != null && input.unitCost < 0) return { error: "Prix d'achat invalide" }

  // Calculer le nouveau stock et le delta
  let newStock: number
  let delta: number
  let updatedVariants: Variant[] | null = null

  if (hasVariants && input.variantAdjustments && input.variantAdjustments.length > 0) {
    const result: Variant[] = []
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i]
      const label = getVariantLabel(v, i)
      const adj = input.variantAdjustments.find(a => a.label === label)
      if (!adj) { result.push(v); continue }
      let newQty: number
      if (input.type === 'correction') {
        newQty = Math.max(0, adj.value)
      } else if (input.type === 'restock') {
        newQty = v.qty + adj.value
        if (newQty < 0) return { error: `Stock invalide pour "${label}".` }
      } else {
        newQty = v.qty - adj.value
        if (newQty < 0) {
          return { error: `Stock insuffisant pour "${label}". Stock actuel : ${v.qty} unité${v.qty !== 1 ? 's' : ''}.` }
        }
      }
      result.push({ ...v, qty: newQty })
    }
    updatedVariants = result
    newStock = updatedVariants.reduce((s, v) => s + v.qty, 0)
    delta = newStock - product.stock
  } else if (hasVariants) {
    return { error: 'Ce produit a des variantes. Ajustez le stock variante par variante.' }
  } else {
    if (input.type === 'restock') {
      delta = input.quantity
      newStock = product.stock + delta
    } else if (input.type === 'correction') {
      newStock = input.quantity
      delta = newStock - product.stock
    } else {
      delta = -input.quantity
      newStock = product.stock + delta
    }

    if (newStock < 0) {
      return {
        error: `Stock insuffisant. Stock actuel : ${product.stock} unité${product.stock !== 1 ? 's' : ''}. Vous ne pouvez pas retirer ${input.quantity} unité${input.quantity !== 1 ? 's' : ''}.`,
      }
    }
  }

  // Le trigger trg_sync_stock_from_variants recalcule automatiquement products.stock
  // depuis la somme des variantes — pas besoin de le définir explicitement ici.
  const productUpdate: Record<string, unknown> = updatedVariants
    ? { variants: updatedVariants }
    : { stock: newStock }

  if (input.type === 'restock' && input.unitCost != null && input.unitCost > 0 && input.costUpdateMode !== 'keep') {
    const mode = input.costUpdateMode ?? 'new'
    if (mode === 'wac') {
      productUpdate.cost = product.cost && product.stock > 0 && delta > 0
        ? Math.round(((product.stock * product.cost + delta * input.unitCost) / newStock) * 100) / 100
        : input.unitCost
    } else if (mode === 'new') {
      productUpdate.cost = input.unitCost
    }
  }

  const { error: upErr } = await supabase.from('products')
    .update(productUpdate)
    .eq('id', id).eq('seller_id', context.sellerId)
  if (upErr) return { error: upErr.message }

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()
  const sellerName = seller?.name ?? ''

  // Log dans stock_movements
  await supabase.from('stock_movements').insert({
    seller_id: context.sellerId,
    product_id: id,
    quantity_before: product.stock,
    quantity_after: newStock,
    delta,
    movement_type: input.type,
    unit_cost: input.unitCost ?? null,
    supplier: input.supplier ?? null,
    notes: input.notes ?? null,
    created_by: context.userId,
    created_by_name: sellerName,
  })

  const typeLabel = { restock: 'Réapprovisionnement', correction: "Correction d'inventaire", return: 'Retour fournisseur', loss: 'Perte / Casse' }
  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: sellerName || context.userId,
    actionType: 'product_updated',
    entityType: 'product',
    entityId: id,
    description: `a ajusté le stock de "${product.name}" : ${product.stock} → ${newStock} (${typeLabel[input.type]})`,
    metadata: { type: input.type, delta, stockBefore: product.stock, stockAfter: newStock },
  })

  revalidatePath('/catalog')
  revalidatePath(`/catalog/${id}`)
  revalidateTag('dashboard')
  return {}
}
