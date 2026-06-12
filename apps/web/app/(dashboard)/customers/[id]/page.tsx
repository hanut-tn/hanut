import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import CustomerDetail from '@/components/customers/CustomerDetail'
import { updateCustomer } from '../actions'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }
type CustomerOrders = Parameters<typeof CustomerDetail>[0]['orders']
type CustomerStats = {
  total_spent: number
  order_count: number
  delivery_rate: number
  favorite_product: string | null
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params
  const context = await getUserContext()
  if (!context) return null

  const supabase = await createServerClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, phone, address, city, created_at, tags, notes')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .single()

  if (!customer) notFound()

  const [{ data: orders, count: totalOrders }, { data: statsRaw, error: statsError }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, cod_amount, status, variant, quantity, created_at, product:products(id, name)', { count: 'exact' })
      .eq('customer_id', id)
      .eq('seller_id', context.sellerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(0, 9),
    supabase.rpc('get_customer_stats', {
      p_customer_id: id,
      p_seller_id: context.sellerId,
    }),
  ])

  if (statsError) {
    throw new Error(statsError.message)
  }

  const orderList = orders ?? []
  const stats = (statsRaw ?? {}) as Partial<CustomerStats>
  const orderCount = totalOrders ?? stats.order_count ?? 0

  return (
    <CustomerDetail
      customer={{
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address ?? undefined,
        city: customer.city ?? undefined,
        created_at: customer.created_at,
        tags: (customer.tags as string[] | null) ?? [],
        notes: customer.notes ?? '',
      }}
      orders={orderList as CustomerOrders}
      totalOrders={orderCount}
      stats={{
        total_spent: stats.total_spent ?? 0,
        order_count: stats.order_count ?? orderCount,
        delivery_rate: stats.delivery_rate ?? 0,
        favorite_product: stats.favorite_product ?? null,
      }}
      plan={context.plan}
      updateCustomer={updateCustomer}
    />
  )
}
