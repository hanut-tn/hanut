import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import ProductDetailClient from '@/components/catalog/ProductDetailClient'
import { upsertProduct, deleteProduct, adjustStock } from '../actions'
import { createRestockOrder, receiveRestockOrder, cancelRestockOrder, syncProductStock } from '../restock-actions'
import type { Product } from '@hanut/types'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Produit #${id.slice(0, 8)} — Hanut`,
    robots: { index: false, follow: false },
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const context = await getUserContext()
  if (!context) return null
  if (context.role === 'readonly') redirect('/orders')

  const supabase = await createServerClient()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .single()

  if (!product) redirect('/catalog')

  type ProductStats = {
    total_orders: number
    total_revenue: number
    total_qty_sold: number
    this_month_qty: number
    returned_count: number
    has_blocking_orders: boolean
    recent_orders: Array<{
      id: string
      cod_amount: number
      status: string
      created_at: string
      quantity: number
      customer_name: string | null
    }>
  }

  const [{ data: rawStats }, { data: rawPlannedRestocks }, stockMovementsRes] = await Promise.all([
    supabase.rpc('get_product_stats', {
      p_seller_id: context.sellerId,
      p_product_id: id,
    }),

    supabase
      .from('restock_orders')
      .select('id, total_quantity, unit_cost, supplier, expected_date, created_at, variants_quantities')
      .eq('product_id', id)
      .eq('seller_id', context.sellerId)
      .eq('status', 'planned')
      .order('created_at', { ascending: false }),

    supabase
      .from('stock_movements')
      .select('id, delta, quantity_before, quantity_after, movement_type, unit_cost, supplier, notes, created_by_name, created_at, variant_name')
      .eq('product_id', id)
      .eq('seller_id', context.sellerId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])
  const stockMovements = stockMovementsRes.data ?? []

  const stats = rawStats as ProductStats | null
  const totalOrders = stats?.total_orders ?? 0
  const totalRevenue = stats?.total_revenue ?? 0
  const totalQtySold = stats?.total_qty_sold ?? 0
  const thisMonthQty = stats?.this_month_qty ?? 0
  const returnedCount = stats?.returned_count ?? 0
  const hasBlockingOrders = stats?.has_blocking_orders ?? false
  const returnRate = totalOrders > 0 ? Math.round((returnedCount / totalOrders) * 100) : 0

  const recentOrders = (stats?.recent_orders ?? []).map(o => ({
    id: o.id,
    cod_amount: o.cod_amount,
    status: o.status,
    created_at: o.created_at,
    quantity: o.quantity,
    customer_name: o.customer_name,
  }))

  const plannedRestocks = (rawPlannedRestocks ?? []).map(r => ({
    id: r.id as string,
    total_quantity: r.total_quantity as number,
    unit_cost: r.unit_cost as number | null,
    supplier: r.supplier as string | null,
    expected_date: r.expected_date as string | null,
    created_at: r.created_at as string,
    variants_quantities: (r.variants_quantities ?? []) as { variant: string; quantity: number }[],
  }))

  return (
    <ProductDetailClient
      product={product as Product}
      role={context.role}
      plan={context.plan}
      stats={{
        totalOrders: totalOrders ?? 0,
        totalRevenue,
        totalQtySold,
        thisMonthQty,
        returnRate,
      }}
      recentOrders={recentOrders}
      stockMovements={stockMovements}
      plannedRestocks={plannedRestocks}
      hasBlockingOrders={hasBlockingOrders}
      upsertProduct={upsertProduct}
      deleteProduct={deleteProduct}
      adjustStock={adjustStock}
      createRestockOrder={createRestockOrder}
      receiveRestockOrder={receiveRestockOrder}
      cancelRestockOrder={cancelRestockOrder}
      syncProductStock={syncProductStock}
    />
  )
}
