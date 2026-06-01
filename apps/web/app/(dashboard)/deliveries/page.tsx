import { createServerClient } from '@/lib/supabase/server'
import DeliveriesClient from '@/components/deliveries/DeliveriesClient'
import { createDelivery, updateDelivery, deleteDelivery } from './actions'

export default async function DeliveriesPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: deliveries } = await supabase
    .from('deliveries')
    .select(`
      id, carrier, tracking_number, carrier_status, fee,
      cod_collected, cod_reversed, created_at, delivered_at,
      order:orders(
        id, cod_amount,
        customer:customers(name, phone),
        product:products(name)
      )
    `)
    .order('created_at', { ascending: false })

  const linkedOrderIds = new Set(
    (deliveries ?? []).map(d => {
      const o = Array.isArray(d.order) ? d.order[0] : d.order
      return o?.id
    }).filter(Boolean)
  )

  const { data: allShipped } = await supabase
    .from('orders')
    .select(`id, cod_amount, customer:customers(name, phone), product:products(name)`)
    .eq('seller_id', user.id)
    .eq('status', 'shipped')
    .order('created_at', { ascending: false })

  const shippableOrders = (allShipped ?? []).filter(o => !linkedOrderIds.has(o.id))

  return (
    <DeliveriesClient
      deliveries={(deliveries ?? []) as any[]}
      shippableOrders={shippableOrders as any[]}
      createDelivery={createDelivery}
      updateDelivery={updateDelivery}
      deleteDelivery={deleteDelivery}
    />
  )
}
