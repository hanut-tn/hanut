'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getVariantLabel } from '@/lib/variants'

export type RestockOrderInput = {
  totalQuantity: number
  unitCost?: number | null
  supplier?: string | null
  expectedDate?: string | null
  notes?: string | null
  variantsQuantities?: { variant: string; quantity: number }[]
}

export type CostUpdateMode = 'wac' | 'new' | 'keep'

type ProductVariant = { size?: string; color?: string; name?: string; qty: number }
type VariantRestock = { variant: string; quantity: number }

export async function createRestockOrder(
  productId: string,
  input: RestockOrderInput,
): Promise<{ error?: string; id?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }
  if (!Number.isInteger(input.totalQuantity) || input.totalQuantity <= 0) {
    return { error: 'Quantité invalide' }
  }
  if (input.unitCost != null && input.unitCost < 0) {
    return { error: "Prix d'achat invalide" }
  }
  if (input.variantsQuantities?.some(item => !Number.isInteger(item.quantity) || item.quantity < 0)) {
    return { error: 'Quantité de variante invalide' }
  }
  const variantsTotal = input.variantsQuantities?.reduce((sum, item) => sum + item.quantity, 0) ?? null
  if (variantsTotal !== null && variantsTotal > 0 && variantsTotal !== input.totalQuantity) {
    return { error: 'Le total des variantes ne correspond pas à la quantité planifiée' }
  }

  const supabase = await createServerClient()

  const { data: product } = await supabase
    .from('products')
    .select('name')
    .eq('id', productId)
    .eq('seller_id', context.sellerId)
    .single()

  if (!product) return { error: 'Produit introuvable' }

  const { data, error } = await supabase
    .from('restock_orders')
    .insert({
      seller_id: context.sellerId,
      product_id: productId,
      total_quantity: input.totalQuantity,
      unit_cost: input.unitCost ?? null,
      supplier: input.supplier ?? null,
      expected_date: input.expectedDate ?? null,
      notes: input.notes ?? null,
      variants_quantities: input.variantsQuantities ?? [],
      created_by: context.userId,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'product_updated',
    entityType: 'product',
    entityId: productId,
    description: `a planifié un réapprovisionnement de +${input.totalQuantity} unités pour "${product.name}"`,
    metadata: { totalQuantity: input.totalQuantity, expectedDate: input.expectedDate },
  })

  revalidatePath(`/catalog/${productId}`)
  return { id: data.id }
}

export async function receiveRestockOrder(
  restockId: string,
  costUpdateMode: CostUpdateMode = 'wac',
): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }

  const supabase = await createServerClient()

  const { data: restock } = await supabase
    .from('restock_orders')
    .select('id, product_id, total_quantity, unit_cost, status, variants_quantities')
    .eq('id', restockId)
    .eq('seller_id', context.sellerId)
    .eq('status', 'planned')
    .single()

  if (!restock) return { error: 'Réapprovisionnement introuvable ou déjà traité' }

  const { data: product } = await supabase
    .from('products')
    .select('stock, cost, price, variants')
    .eq('id', restock.product_id)
    .eq('seller_id', context.sellerId)
    .single()

  if (!product) return { error: 'Produit introuvable' }

  const variants = (product.variants ?? []) as ProductVariant[]
  const variantsQuantities = (restock.variants_quantities ?? []) as VariantRestock[]
  if (variants.length > 0 && variantsQuantities.length === 0) {
    return { error: 'Ce produit a des variantes. Renseignez les quantités reçues par variante.' }
  }
  const hasVariantRestock = variants.length > 0 && variantsQuantities.length > 0
  const updatedVariants = hasVariantRestock
    ? variants.map((v, index) => {
        const qty = variantsQuantities.find(item => item.variant === getVariantLabel(v, index))?.quantity ?? 0
        return { ...v, qty: v.qty + Math.max(0, qty) }
      })
    : null

  const newStock = updatedVariants
    ? updatedVariants.reduce((sum, v) => sum + v.qty, 0)
    : product.stock + restock.total_quantity

  let newCost: number | null = product.cost ?? null
  const unitCost = restock.unit_cost as number | null
  if (unitCost && unitCost > 0 && costUpdateMode !== 'keep') {
    if (costUpdateMode === 'wac') {
      newCost = product.cost && product.stock > 0
        ? Math.round(((product.stock * product.cost + restock.total_quantity * unitCost) / (product.stock + restock.total_quantity)) * 100) / 100
        : unitCost
    } else if (costUpdateMode === 'new') {
      newCost = unitCost
    }
  }

  const productUpdate: Record<string, unknown> = { stock: newStock }
  if (updatedVariants) productUpdate.variants = updatedVariants
  if (newCost !== null && costUpdateMode !== 'keep') productUpdate.cost = newCost

  const { error: stockError } = await supabase
    .from('products')
    .update(productUpdate)
    .eq('id', restock.product_id)
    .eq('seller_id', context.sellerId)

  if (stockError) return { error: stockError.message }

  const today = new Date().toISOString().slice(0, 10)
  const { error: restockError } = await supabase
    .from('restock_orders')
    .update({ status: 'received', received_date: today, updated_at: new Date().toISOString() })
    .eq('id', restockId)
    .eq('seller_id', context.sellerId)

  if (restockError) {
    await supabase
      .from('products')
      .update({ stock: product.stock, cost: product.cost ?? null, variants })
      .eq('id', restock.product_id)
      .eq('seller_id', context.sellerId)
    return { error: restockError.message }
  }

  const { data: seller } = await supabase.from('sellers').select('name').eq('id', context.sellerId).maybeSingle()

  await supabase.from('stock_movements').insert({
    seller_id: context.sellerId,
    product_id: restock.product_id,
    quantity_before: product.stock,
    quantity_after: newStock,
    delta: restock.total_quantity,
    movement_type: 'restock',
    notes: 'Réapprovisionnement planifié reçu',
    unit_cost: unitCost,
    created_by: context.userId,
    created_by_name: seller?.name ?? '',
  })

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: seller?.name ?? context.userId,
    actionType: 'product_updated',
    entityType: 'product',
    entityId: restock.product_id,
    description: `a marqué un réapprovisionnement comme reçu (+${restock.total_quantity} unités)`,
  })

  revalidatePath(`/catalog/${restock.product_id}`)
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
  return {}
}

export async function cancelRestockOrder(restockId: string): Promise<{ error?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }

  const supabase = await createServerClient()

  const { data: restock } = await supabase
    .from('restock_orders')
    .select('id, product_id, status')
    .eq('id', restockId)
    .eq('seller_id', context.sellerId)
    .eq('status', 'planned')
    .single()

  if (!restock) return { error: 'Réapprovisionnement introuvable ou déjà traité' }

  const { error } = await supabase
    .from('restock_orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', restockId)
    .eq('seller_id', context.sellerId)

  if (error) return { error: error.message }

  revalidatePath(`/catalog/${restock.product_id}`)
  return {}
}

export async function syncProductStock(productId: string): Promise<{ error?: string; newStock?: number }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }

  const supabase = await createServerClient()

  const { data, error } = await supabase.rpc('sync_product_stock', { p_product_id: productId })
  if (error) return { error: error.message }

  revalidatePath(`/catalog/${productId}`)
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
  return { newStock: data as number }
}
