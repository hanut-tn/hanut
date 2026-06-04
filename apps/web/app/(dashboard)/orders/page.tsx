import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import OrdersClient from '@/components/orders/OrdersClient'
import { updateOrderStatus, deleteOrder, confirmPendingOrder, cancelPendingOrder, restoreOrder, permanentlyDeleteOrder } from './actions'

type Orders = Parameters<typeof OrdersClient>[0]['orders']
type TrashOrders = Parameters<typeof OrdersClient>[0]['trashOrders']

export default async function OrdersPage() {
  const context = await getUserContext()
  if (!context) return null

  const supabase = await createServerClient()

  const [{ data: orders }, { data: trashOrders }] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        id, cod_amount, status, variant, quantity, notes, created_at,
        customer:customers(id, name, phone, city),
        product:products(id, name, price)
      `)
      .eq('seller_id', context.sellerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),

    context.role === 'admin'
      ? supabase
          .from('orders')
          .select(`
            id, cod_amount, status, variant, quantity, deleted_at,
            customer:customers(id, name, phone, city),
            product:products(id, name, price)
          `)
          .eq('seller_id', context.sellerId)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false })
      : { data: [] },
  ])

  return (
    <OrdersClient
      role={context.role}
      plan={context.plan}
      orders={(orders ?? []) as Orders}
      trashOrders={(trashOrders ?? []) as TrashOrders}
      updateStatus={updateOrderStatus}
      deleteOrder={deleteOrder}
      confirmOrder={confirmPendingOrder}
      cancelPendingOrder={cancelPendingOrder}
      restoreOrder={restoreOrder}
      permanentlyDeleteOrder={permanentlyDeleteOrder}
    />
  )
}
