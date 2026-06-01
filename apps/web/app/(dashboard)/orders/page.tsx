import { createServerClient } from '@/lib/supabase/server'
import OrdersClient from '@/components/orders/OrdersClient'
import { updateOrderStatus, deleteOrder } from './actions'

export default async function OrdersPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, cod_amount, status, variant, quantity, notes, created_at,
      customer:customers(id, name, phone, city),
      product:products(id, name, price)
    `)
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <OrdersClient
      orders={(orders ?? []) as any[]}
      updateStatus={updateOrderStatus}
      deleteOrder={deleteOrder}
    />
  )
}
