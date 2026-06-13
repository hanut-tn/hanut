'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getVariantLabel, sumVariantStock } from '@/lib/variants'
import { requireActive } from '@/lib/assert-active'

const ProductSchema = z.object({
  name: z.string().min(1, 'Le nom est obligatoire').max(200, 'Le nom ne doit pas dépasser 200 caractères'),
  price: z.number().min(0, 'Le prix doit être positif ou nul').max(100000, 'Le prix semble incorrect'),
  cost: z.number().min(0, 'Le coût doit être positif ou nul').max(100000, 'Le coût semble incorrect').optional().nullable(),
  stock: z.number().int('Le stock doit être un nombre entier').min(0, 'Le stock doit être positif ou nul'),
  low_stock_alert: z.number().int().min(0).optional().nullable(),
  description: z.string().max(2000, 'La description ne doit pas dépasser 2000 caractères').optional().nullable(),
  variants: z.array(z.object({
    size: z.string().max(50).optional().nullable(),
    color: z.string().max(50).optional().nullable(),
    qty: z.number().int().min(0),
  })).optional().nullable(),
})

const UpdateProductSchema = ProductSchema.partial().extend({
  id: z.string().uuid('ID produit invalide'),
})

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
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const schema = input.id ? UpdateProductSchema : ProductSchema
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

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
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role !== 'admin') return { error: 'Seuls les admins peuvent supprimer des produits' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

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
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

export async function uploadProductImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

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
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
  const filePath = `${context.sellerId}/${Date.now()}_${sanitizedName}`

  // Garantir que le path reste dans le dossier du vendeur même si la logique change.
  if (!filePath.startsWith(`${context.sellerId}/`)) {
    return { error: 'Chemin de fichier invalide.' }
  }

  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await serviceClient.storage
    .from('product-images')
    .upload(filePath, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = serviceClient.storage
    .from('product-images')
    .getPublicUrl(filePath)

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
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const supabase = await createServerClient()

  // Pré-lecture pour validation applicative (erreurs compréhensibles avant d'appeler la RPC)
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

  // Déterminer les appels RPC à effectuer.
  // Pour les variantes : un appel par variante ajustée (le FOR UPDATE de la RPC protège contre les races).
  // Pour les produits sans variantes : un seul appel avec p_variant_name = null.
  type RpcCall = { variantName: string | null; delta: number }
  const rpcCalls: RpcCall[] = []

  if (hasVariants && input.variantAdjustments && input.variantAdjustments.length > 0) {
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i]
      const label = getVariantLabel(v, i)
      const adj = input.variantAdjustments.find(a => a.label === label)
      if (!adj) continue

      let delta: number
      if (input.type === 'correction') {
        delta = Math.max(0, adj.value) - v.qty
      } else if (input.type === 'restock') {
        delta = adj.value
        if (v.qty + delta < 0) return { error: `Stock invalide pour "${label}".` }
      } else {
        delta = -adj.value
        if (v.qty + delta < 0) {
          return { error: `Stock insuffisant pour "${label}". Stock actuel : ${v.qty} unité${v.qty !== 1 ? 's' : ''}.` }
        }
      }
      rpcCalls.push({ variantName: label, delta })
    }
    if (rpcCalls.length === 0) return { error: 'Aucune variante à ajuster.' }
  } else if (hasVariants) {
    return { error: 'Ce produit a des variantes. Ajustez le stock variante par variante.' }
  } else {
    let delta: number
    if (input.type === 'restock') {
      delta = input.quantity
    } else if (input.type === 'correction') {
      delta = input.quantity - product.stock
    } else {
      delta = -input.quantity
    }
    if (product.stock + delta < 0) {
      return {
        error: `Stock insuffisant. Stock actuel : ${product.stock} unité${product.stock !== 1 ? 's' : ''}. Vous ne pouvez pas retirer ${input.quantity} unité${input.quantity !== 1 ? 's' : ''}.`,
      }
    }
    rpcCalls.push({ variantName: null, delta })
  }

  const effectiveCalls = rpcCalls.filter(c => c.delta !== 0)
  if (effectiveCalls.length === 0) return { error: 'Le delta ne peut pas être zéro.' }

  // Appels RPC atomiques (FOR UPDATE dans la RPC protège contre les races concurrentes)
  const sellerNameResult = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()
  const sellerName = sellerNameResult.data?.name ?? ''

  // Pour WAC 'new' sans passer par la RPC : mettre à jour le coût après les appels RPC
  const unitCostForRpc = input.type === 'restock' && input.costUpdateMode !== 'keep' && input.costUpdateMode !== 'new'
    ? (input.unitCost ?? null)
    : null

  type AdjustStockResult = { stock_before: number; stock_after: number; delta: number }
  let lastResult: AdjustStockResult | null = null

  for (const call of effectiveCalls) {
    const { data, error: rpcErr } = await supabase.rpc('adjust_product_stock', {
      p_seller_id: context.sellerId,
      p_product_id: id,
      p_variant_name: call.variantName ?? '',
      p_delta: call.delta,
      p_movement_type: input.type,
      p_unit_cost: unitCostForRpc,
      p_supplier: input.supplier ?? null,
      p_notes: input.notes ?? null,
      p_changed_by: context.userId,
      p_changed_by_name: sellerName,
    })
    if (rpcErr) {
      if (rpcErr.message.includes('PRODUCT_NOT_FOUND')) return { error: 'Produit introuvable.' }
      return { error: rpcErr.message }
    }
    lastResult = data as AdjustStockResult
  }

  // Pour 'new' : mettre à jour le coût directement (la RPC gère 'wac', pas 'new')
  if (input.type === 'restock' && input.unitCost != null && input.unitCost > 0 && input.costUpdateMode === 'new') {
    await supabase.from('products').update({ cost: input.unitCost }).eq('id', id).eq('seller_id', context.sellerId)
  }

  const newStock = lastResult?.stock_after ?? product.stock

  const typeLabel = { restock: 'Réapprovisionnement', correction: "Correction d'inventaire", return: 'Retour fournisseur', loss: 'Perte / Casse' }
  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: sellerName || context.userId,
    actionType: 'product_updated',
    entityType: 'product',
    entityId: id,
    description: `a ajusté le stock de "${product.name}" : ${product.stock} → ${newStock} (${typeLabel[input.type]})`,
    metadata: { type: input.type, stockBefore: product.stock, stockAfter: newStock },
  })

  revalidatePath('/catalog')
  revalidatePath(`/catalog/${id}`)
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}
