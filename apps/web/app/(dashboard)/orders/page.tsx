import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Commandes — Hanut',
  robots: { index: false, follow: false },
}

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext, getMonthlyOrderCount } from '@/lib/get-context'
import OrdersClient from '@/components/orders/OrdersClient'
import { updateOrderStatus, deleteOrder, confirmPendingOrder, cancelOrder, restoreOrder, permanentlyDeleteOrder } from './actions'
import { createDeliveryFromOrder } from '@/app/(dashboard)/deliveries/actions'
import { ORDER_STATUSES } from '@/lib/constants'

type Orders = Parameters<typeof OrdersClient>[0]['orders']
type TrashOrders = Parameters<typeof OrdersClient>[0]['trashOrders']

export default async function OrdersPage() {
  const context = await getUserContext()
  if (!context) return null

  const supabase = await createServerClient()

  const monthlyOrderCount = context.plan === 'starter' ? await getMonthlyOrderCount(context.sellerId) : 0

  const [{ data: orders, count: ordersCount }, { data: trashOrders }, ...statusCountResults] = await Promise.all([
    supabase
      .from('orders')
      .select(
        `id, cod_amount, status, variant, quantity, notes, created_at,
         customer_address, customer_city, customer_governorate, customer_delegation,
         customer_landmark, customer_postal_code, delivery_notes, address_version,
         customer:customers(id, name, phone, address, city, customer_governorate, customer_city, customer_delegation, customer_address, customer_landmark, customer_postal_code, delivery_notes, address_version),
         product:products(id, name, price)`,
        { count: 'exact' }
      )
      .eq('seller_id', context.sellerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(0, 19),

    context.role === 'admin'
      ? supabase
          .from('orders')
          .select(`id, cod_amount, status, variant, quantity, notes, created_at, deleted_at,
            customer_address, customer_city, customer_governorate, customer_delegation,
            customer_landmark, customer_postal_code, delivery_notes, address_version,
            customer:customers(id, name, phone, address, city, customer_governorate, customer_city, customer_delegation, customer_address, customer_landmark, customer_postal_code, delivery_notes, address_version),
            product:products(id, name, price)`)
          .eq('seller_id', context.sellerId)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false })
      : { data: [] },

    // COUNT par statut — une requête HEAD par statut évite de charger toutes les lignes.
    ...ORDER_STATUSES.map(status =>
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', context.sellerId)
        .eq('status', status)
        .is('deleted_at', null)
    ),
  ])

  const initialTotal = ordersCount ?? 0
  const tabCounts: Record<string, number> = { all: initialTotal }
  ORDER_STATUSES.forEach((status, i) => {
    tabCounts[status] = statusCountResults[i]?.count ?? 0
  })

  return (
    <OrdersClient
      role={context.role}
      plan={context.plan}
      orders={(orders ?? []) as Orders}
      initialTotal={initialTotal}
      tabCounts={tabCounts}
      trashOrders={(trashOrders ?? []) as TrashOrders}
      updateStatus={updateOrderStatus}
      deleteOrder={deleteOrder}
      confirmOrder={confirmPendingOrder}
      cancelOrder={cancelOrder}
      restoreOrder={restoreOrder}
      permanentlyDeleteOrder={permanentlyDeleteOrder}
      createDeliveryFromOrder={createDeliveryFromOrder}
      monthlyOrderCount={monthlyOrderCount}
    />
  )
}
