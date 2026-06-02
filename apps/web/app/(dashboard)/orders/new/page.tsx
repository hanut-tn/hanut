import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { redirect } from 'next/navigation'
import NewOrderForm from '@/components/orders/NewOrderForm'
import { createOrder } from '../actions'
import type { Product } from '@hanut/types'

type Props = { searchParams: Promise<{ customer_id?: string }> }

export default async function NewOrderPage({ searchParams }: Props) {
  const { customer_id } = await searchParams
  const context = await getUserContext()
  if (!context) return null
  if (context.role === 'readonly') redirect('/orders')

  const supabase = await createServerClient()

  const [productsResult, customerResult] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, price, stock, variants, image_url')
      .eq('seller_id', context.sellerId)
      .order('name'),
    customer_id
      ? supabase
          .from('customers')
          .select('id, name, phone, address, city')
          .eq('id', customer_id)
          .eq('seller_id', context.sellerId)
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
