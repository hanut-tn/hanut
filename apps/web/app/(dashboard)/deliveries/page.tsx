import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { redirect } from 'next/navigation'
import DeliveriesClient from '@/components/deliveries/DeliveriesClient'
import { createDelivery, updateDelivery, deleteDelivery } from './actions'

type Deliveries = Parameters<typeof DeliveriesClient>[0]['deliveries']
type ShippableOrders = Parameters<typeof DeliveriesClient>[0]['shippableOrders']
type Delivery = Deliveries[number]
type ShippableOrder = ShippableOrders[number]

type JoinedPerson = { name: string; phone: string } | { name: string; phone: string }[] | null
type JoinedProduct = { name: string } | { name: string }[] | null
type JoinedOrder = (Omit<ShippableOrder, 'customer' | 'product'> & {
  deleted_at?: string | null
  customer: JoinedPerson
  product: JoinedProduct
}) | (Omit<ShippableOrder, 'customer' | 'product'> & {
  deleted_at?: string | null
  customer: JoinedPerson
  product: JoinedProduct
})[] | null

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function normalizeOrder(order: JoinedOrder): (ShippableOrder & { deleted_at?: string | null }) | null {
  const current = firstOrNull(order)
  const customer = firstOrNull(current?.customer)
  const product = firstOrNull(current?.product)

  if (!current || !customer || !product) return null

  return {
    id: current.id,
    cod_amount: current.cod_amount,
    deleted_at: current.deleted_at,
    customer,
    product,
  }
}

export default async function DeliveriesPage() {
  const context = await getUserContext()
  if (!context) return null
  if (context.role === 'readonly') redirect('/orders')

  const supabase = await createServerClient()

  const { data: deliveries } = await supabase
    .from('deliveries')
    .select(`
      id, carrier, tracking_number, carrier_status, fee,
      cod_collected, cod_reversed, created_at, delivered_at,
      order:orders(
        id, cod_amount, deleted_at,
        customer:customers(name, phone),
        product:products(name)
      )
    `)
    .order('created_at', { ascending: false })

  const normalizedDeliveries: Delivery[] = (deliveries ?? []).flatMap(delivery => {
    const order = normalizeOrder(delivery.order)
    if (!order || order.deleted_at !== null) return []

    return [{
      id: delivery.id,
      carrier: delivery.carrier,
      tracking_number: delivery.tracking_number,
      carrier_status: delivery.carrier_status,
      fee: delivery.fee,
      cod_collected: delivery.cod_collected,
      cod_reversed: delivery.cod_reversed,
      created_at: delivery.created_at,
      delivered_at: delivery.delivered_at,
      order,
    }]
  })

  const linkedOrderIds = new Set(normalizedDeliveries.map(d => {
    const order = Array.isArray(d.order) ? d.order[0] : d.order
    return order.id
  }))

  const { data: allShipped } = await supabase
    .from('orders')
    .select(`id, cod_amount, customer:customers(name, phone), product:products(name)`)
    .eq('seller_id', context.sellerId)
    .eq('status', 'shipped')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const shippableOrders: ShippableOrder[] = (allShipped ?? []).flatMap(order => {
    if (linkedOrderIds.has(order.id)) return []

    const customer = firstOrNull(order.customer)
    const product = firstOrNull(order.product)
    if (!customer || !product) return []

    return [{
      id: order.id,
      cod_amount: order.cod_amount,
      customer,
      product,
    }]
  })

  return (
    <DeliveriesClient
      deliveries={normalizedDeliveries}
      shippableOrders={shippableOrders}
      createDelivery={createDelivery}
      updateDelivery={updateDelivery}
      deleteDelivery={deleteDelivery}
    />
  )
}
