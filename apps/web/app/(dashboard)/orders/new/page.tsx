import { createServerClient } from '@/lib/supabase/server'
import NewOrderForm from '@/components/orders/NewOrderForm'
import { createOrder } from '../actions'
import type { Product } from '@hanut/types'

type Props = { searchParams: Promise<{ customer_id?: string }> }

export default async function NewOrderPage({ searchParams }: Props) {
  const { customer_id } = await searchParams
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [productsResult, customerResult] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, price, stock, variants')
      .eq('seller_id', user.id)
      .order('name'),
    customer_id
      ? supabase
          .from('customers')
          .select('id, name, phone, address, city')
          .eq('id', customer_id)
          .eq('seller_id', user.id)
          .single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <NewOrderForm
      products={(productsResult.data ?? []) as Product[]}
      createOrder={createOrder}
      initialCustomer={customerResult.data ?? undefined}
    />
  )
}
