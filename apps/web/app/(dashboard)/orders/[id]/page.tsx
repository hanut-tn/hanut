import { createServerClient } from '@/lib/supabase/server'
import OrderDetail from '@/components/orders/OrderDetail'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, status, cod_amount, variant, quantity, notes, created_at,
      customer:customers(id, name, phone, address, city),
      product:products(id, name, price)
    `)
    .eq('id', id)
    .eq('seller_id', user.id)
    .single()

  if (!order) notFound()

  const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer

  // For pending orders: check if a DIFFERENT customer exists with the same phone
  let linkedCustomer: { id: string; name: string } | null = null
  let hasExistingCustomer = false

  if (order.status === 'pending' && customer?.phone) {
    const { data: match } = await supabase
      .from('customers')
      .select('id, name')
      .eq('seller_id', user.id)
      .eq('phone', customer.phone)
      .neq('id', customer.id)
      .maybeSingle()

    if (match) {
      linkedCustomer = match
      hasExistingCustomer = true
    }
  }

  const product = Array.isArray(order.product) ? order.product[0] : order.product

  return (
    <OrderDetail
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
      linkedCustomer={linkedCustomer}
      hasExistingCustomer={hasExistingCustomer}
    />
  )
}
