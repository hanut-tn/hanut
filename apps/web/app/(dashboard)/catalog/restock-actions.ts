'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { logActivity } from '@/lib/activity'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireActive } from '@/lib/assert-active'

export type RestockOrderInput = {
  totalQuantity: number
  unitCost?: number | null
  supplier?: string | null
  expectedDate?: string | null
  notes?: string | null
  variantsQuantities?: { variant: string; quantity: number }[]
}

export type CostUpdateMode = 'wac' | 'new' | 'keep'

export async function createRestockOrder(
  productId: string,
  input: RestockOrderInput,
): Promise<{ error?: string; id?: string }> {
  const context = await getUserContext()
  if (!context) return { error: 'Non autorisé' }
  if (context.role === 'readonly') return { error: 'Action réservée aux admins et opérateurs' }
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck
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


  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
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
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const supabase = await createServerClient()

  const { data: restock } = await supabase
    .from('restock_orders')
    .select('id, product_id, total_quantity, unit_cost, status, variants_quantities')
    .eq('id', restockId)
    .eq('seller_id', context.sellerId)
    .eq('status', 'planned')
    .single()

  if (!restock) return { error: 'Réapprovisionnement introuvable ou déjà traité' }

  const { error: rpcError } = await supabase.rpc('receive_restock_order', {
    p_seller_id: context.sellerId,
    p_restock_id: restockId,
    p_cost_update_mode: costUpdateMode,
    p_changed_by: context.userId,
    p_changed_by_name: context.userName,
  })

  if (rpcError) {
    if (rpcError.message.includes('RESTOCK_NOT_FOUND')) return { error: 'Réapprovisionnement introuvable ou déjà traité' }
    if (rpcError.message.includes('PRODUCT_NOT_FOUND')) return { error: 'Produit introuvable' }
    if (rpcError.message.includes('VARIANT_QUANTITIES_REQUIRED')) return { error: 'Ce produit a des variantes. Renseignez les quantités reçues par variante.' }
    return { error: rpcError.message }
  }

  await logActivity({
    sellerId: context.sellerId,
    userId: context.userId,
    userName: context.userName,
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
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

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
  const activeCheck = requireActive(context)
  if (activeCheck) return activeCheck

  const supabase = await createServerClient()

  const { data, error } = await supabase.rpc('sync_product_stock', { p_product_id: productId })
  if (error) return { error: error.message }

  revalidatePath(`/catalog/${productId}`)
  revalidatePath('/dashboard')
  revalidateTag(`dashboard-${context.sellerId}`)
  return { newStock: data as number }
}
