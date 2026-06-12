import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import OrderDetail from '@/components/orders/OrderDetail'
import { notFound } from 'next/navigation'
import { updateOrderStatus, confirmPendingOrder, cancelOrder, deleteOrder } from '../actions'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Commande #${id.slice(0, 8)} — Hanut`,
    robots: { index: false, follow: false },
  }
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const context = await getUserContext()
  if (!context) return null

  const supabase = await createServerClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, status, cod_amount, variant, quantity, notes, created_at, tracking_token,
      customer:customers(id, name, phone, address, city),
      product:products(id, name, price, cost, image_url)
    `)
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)
    .single()

  if (!order) notFound()

  const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer
  const product = Array.isArray(order.product) ? order.product[0] : order.product

  // Customer stats + pending-order linking logic
  let linkedCustomer: { id: string; name: string } | null = null
  let hasExistingCustomer = false
  let customerStats = { orderCount: 0, totalSpent: 0 }

  const [linkedResult, statsResult] = await Promise.all([
    // Check for duplicate customer by phone (pending orders only)
    order.status === 'pending' && customer?.phone
      ? supabase
          .from('customers')
          .select('id, name')
          .eq('seller_id', context.sellerId)
          .eq('phone', customer.phone)
          .neq('id', customer.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    // Customer's order history (excluding the current order)
    customer?.id
      ? supabase
          .from('orders')
          .select('cod_amount, status')
          .eq('seller_id', context.sellerId)
          .eq('customer_id', customer.id)
          .neq('id', id)
          .is('deleted_at', null)
          .eq('status', 'delivered')
      : Promise.resolve({ data: null }),
  ])

  if (linkedResult.data) {
    linkedCustomer = linkedResult.data
    hasExistingCustomer = true
  }

  if (statsResult.data) {
    const delivered = statsResult.data as { cod_amount: number; status: string }[]
    customerStats = {
      orderCount: delivered.length,
      totalSpent: delivered.reduce((s, o) => s + o.cod_amount, 0),
    }
  }

  return (
    <OrderDetail
      role={context.role}
      order={{
        id: order.id,
        status: order.status,
        cod_amount: order.cod_amount,
        variant: order.variant,
        quantity: order.quantity,
        notes: order.notes,
        created_at: order.created_at,
      }}
      customer={customer ?? null}
      product={product ?? null}
      customerStats={customerStats}
      linkedCustomer={linkedCustomer}
      hasExistingCustomer={hasExistingCustomer}
      trackingToken={order.tracking_token ?? null}
      updateStatus={updateOrderStatus}
      confirmOrder={confirmPendingOrder}
      cancelOrder={cancelOrder}
      deleteOrder={deleteOrder}
    />
  )
}
