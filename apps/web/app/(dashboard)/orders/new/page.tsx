import { createServerClient } from '@/lib/supabase/server'
import NewOrderForm from '@/components/orders/NewOrderForm'
import { createOrder } from '../actions'
import type { Product } from '@hanut/types'

export default async function NewOrderPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock, variants')
    .eq('seller_id', user.id)
    .order('name')

  return (
    <NewOrderForm
      products={(products ?? []) as Product[]}
      createOrder={createOrder}
    />
  )
}
