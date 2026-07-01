'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getVariantLabel, sumVariantStock } from '@/lib/variants'
import { requireActive } from '@/lib/assert-active'

const ProductVariantSchema = z.object({
  size: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  qty: z.number().int().min(0),
})

const ProductSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire').max(200, 'Le nom ne doit pas dépasser 200 caractères'),
  price: z.number().min(0, 'Le prix doit être positif ou nul').max(100000, 'Le prix semble incorrect'),
  cost: z.number().min(0, 'Le coût doit être positif ou nul').max(100000, 'Le coût semble incorrect').optional().nullable(),
  stock: z.number().int('Le stock doit être un nombre entier').min(0, 'Le stock doit être positif ou nul'),
  low_stock_alert: z.number().int().min(0),
  description: z.string().max(2000, 'La description ne doit pas dépasser 2000 caractères').optional().nullable(),
  variants: z.array(ProductVariantSchema),
  image_url: z.string().url('URL de l’image invalide').max(2048).optional().nullable(),
})

const UpdateProductSchema = ProductSchema.extend({
  id: z.string().uuid('ID produit invalide'),
})

export type ProductVariant = z.infer<typeof ProductVariantSchema>
export type ProductInput = z.infer<typeof ProductSchema> & { id?: string }

export async function upsertProduct(input: ProductInput): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const schema = input.id ? UpdateProductSchema : ProductSchema
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const product = parsed.data

  if (product.variants.length > 1) {
    const labels = product.variants.map((v, i) => getVariantLabel(v, i))
    if (new Set(labels).size !== labels.length) {
      return { error: 'Deux variantes ont le même libellé. Modifiez la taille, la couleur ou le nom pour les distinguer.' }
    }
  }

  const supabase = await createServerClient()

  const payload = {
    name: product.name,
    price: product.price,
    cost: product.cost ?? null,
    stock: product.variants.length > 0 ? sumVariantStock(product.variants) : product.stock,
    low_stock_alert: product.low_stock_alert,
    variants: product.variants,
    image_url: product.image_url ?? null,
    description: product.description ?? null,
  }

  const validatedProductId = 'id' in product && typeof product.id === 'string'
    ? product.id
    : undefined
  const isUpdate = validatedProductId !== undefined
  let productId: string | undefined = validatedProductId

  if (isUpdate) {
    const { error } = await supabase.rpc('update_product', {
      p_seller_id: context.sellerId,
      p_product_id: validatedProductId,
      p_name: product.name,
      p_price: product.price,
      p_cost: product.cost ?? null,
      p_stock: product.variants.length > 0 ? 0 : product.stock,
      p_low_stock_alert: product.low_stock_alert,
      p_variants: product.variants,
      p_image_url: product.image_url ?? null,
      p_description: product.description ?? null,
      p_changed_by: context.userId,
      p_changed_by_name: context.userName,
    })
    if (error) return { error: error.message }
  } else {
    const { data, error } = await supabase.from('products')
      .insert({ ...payload, seller_id: context.sellerId })
      .select('id')
      .single()
    if (error) return { error: error.message }
    productId = data.id
  }

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: isUpdate ? 'product_updated' : 'product_created',
    entityType: 'product',
    entityId: productId,
    description: isUpdate
      ? `a modifié le produit ${product.name}`
      : `a ajouté le produit ${product.name}`,
    metadata: { price: product.price, stock: payload.stock },
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

  // orders.product_id est le premier produit legacy de la commande.
  // Les commandes multi-articles et les nouvelles créations doivent être vérifiées via order_items.
  const { count: activeCount } = await supabase.from('order_items')
    .select('id, orders!inner(id)', { count: 'exact', head: true })
    .eq('product_id', id)
    .eq('seller_id', context.sellerId)
    .in('orders.status', ['pending', 'new', 'confirmed', 'shipped'])
    .is('orders.deleted_at', null)

  if (activeCount && activeCount > 0) {
    return { error: 'Ce produit a des commandes actives (en attente, nouvelles, confirmées ou expédiées) et ne peut pas être supprimé.' }
  }

  const { count: linkedOrdersCount } = await supabase.from('order_items')
    .select('id, orders!inner(id)', { count: 'exact', head: true })
    .eq('product_id', id)
    .eq('seller_id', context.sellerId)
    .in('orders.status', ['cancelled', 'returned', 'delivered'])
    .is('orders.deleted_at', null)

  if (linkedOrdersCount && linkedOrdersCount > 0) {
    return { error: 'Ce produit est lié à des commandes existantes et ne peut pas être supprimé définitivement.' }
  }

  // Bloquer si commandes en corbeille (FK constraint DB)
  const { count: trashedCount } = await supabase.from('order_items')
    .select('id, orders!inner(id)', { count: 'exact', head: true })
    .eq('product_id', id)
    .eq('seller_id', context.sellerId)
    .not('orders.deleted_at', 'is', null)

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

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
    actionType: 'product_deleted',
    entityType: 'product',
    entityId: id,
    description: `a supprimé le produit ${product?.name ?? id}`,
  })

  revalidatePath('/catalog')
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

function isMagicBytesValid(buf: Uint8Array, mimeType: string): boolean {
  switch (mimeType) {
    case 'image/jpeg':
      return buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF
    case 'image/png':
      return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47
    case 'image/webp':
      return buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
        && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    case 'image/heic':
    case 'image/heif':
      return buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70
    default:
      return false
  }
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
  const header = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 16))
  if (!isMagicBytesValid(header, file.type)) {
    return { error: 'Le contenu du fichier ne correspond pas à son extension.' }
  }

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
      p_changed_by_name: context.userName,
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
    userName: context.userName,
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
