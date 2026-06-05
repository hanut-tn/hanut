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

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const stockMovementsRes = await supabase
    .from('stock_movements')
    .select('id, delta, quantity_before, quantity_after, movement_type, unit_cost, supplier, notes, created_by_name, created_at, variant_name')
    .eq('product_id', id)
    .eq('seller_id', context.sellerId)
    .order('created_at', { ascending: false })
    .limit(10)
  const stockMovements = stockMovementsRes.data ?? []

  const [
    { count: totalOrders },
    { data: deliveredOrders },
    { data: thisMonthOrders },
    { count: returnedCount },
    { data: rawRecentOrders },
    { count: linkedOrdersCount },
    { data: rawPlannedRestocks },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)
      .eq('seller_id', context.sellerId)
      .is('deleted_at', null),

    supabase
      .from('orders')
      .select('cod_amount, quantity')
      .eq('product_id', id)
      .eq('seller_id', context.sellerId)
      .eq('status', 'delivered')
      .is('deleted_at', null),

    supabase
      .from('orders')
      .select('quantity')
      .eq('product_id', id)
      .eq('seller_id', context.sellerId)
      .eq('status', 'delivered')
      .is('deleted_at', null)
      .gte('created_at', startOfMonth.toISOString()),

    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)
      .eq('seller_id', context.sellerId)
      .eq('status', 'returned')
      .is('deleted_at', null),

    supabase
      .from('orders')
      .select('id, cod_amount, status, created_at, quantity, customer:customers(name)')
      .eq('product_id', id)
      .eq('seller_id', context.sellerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)
      .eq('seller_id', context.sellerId),

    supabase
      .from('restock_orders')
      .select('id, total_quantity, unit_cost, supplier, expected_date, created_at, variants_quantities')
      .eq('product_id', id)
      .eq('seller_id', context.sellerId)
      .eq('status', 'planned')
      .order('created_at', { ascending: false }),
  ])

  const totalRevenue = deliveredOrders?.reduce((sum, o) => sum + (o.cod_amount ?? 0), 0) ?? 0
  const totalQtySold = deliveredOrders?.reduce((sum, o) => sum + (o.quantity ?? 0), 0) ?? 0
  const thisMonthQty = thisMonthOrders?.reduce((sum, o) => sum + (o.quantity ?? 0), 0) ?? 0
  const returnRate =
    totalOrders && totalOrders > 0
      ? Math.round(((returnedCount ?? 0) / totalOrders) * 100)
      : 0

  const recentOrders = (rawRecentOrders ?? []).map(o => {
    const customer = Array.isArray(o.customer) ? o.customer[0] : o.customer
    return {
      id: o.id,
      cod_amount: o.cod_amount,
      status: o.status,
      created_at: o.created_at,
      quantity: o.quantity,
      customer_name: customer?.name ?? null,
    }
  })

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
      hasBlockingOrders={(linkedOrdersCount ?? 0) > 0}
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
