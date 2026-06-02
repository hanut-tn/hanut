import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import CustomerDetail from '@/components/customers/CustomerDetail'
import { updateCustomer } from '../actions'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

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

  const { data: orders } = await supabase
    .from('orders')
    .select('id, cod_amount, status, variant, quantity, created_at, product:products(id, name)')
    .eq('customer_id', id)
    .eq('seller_id', context.sellerId)
    .order('created_at', { ascending: false })

  const orderList = orders ?? []
  const delivered = orderList.filter(o => o.status === 'delivered')
  const total_spent = delivered.reduce((s, o) => s + o.cod_amount, 0)
  const order_count = orderList.length
  const delivery_rate = order_count > 0 ? Math.round((delivered.length / order_count) * 100) : 0

  const productCounts: Record<string, { name: string; count: number }> = {}
  for (const o of orderList) {
    const p = Array.isArray(o.product) ? o.product[0] : o.product
    if (p) {
      if (!productCounts[p.id]) productCounts[p.id] = { name: p.name, count: 0 }
      productCounts[p.id].count++
    }
  }
  const favorite_product = Object.values(productCounts).sort((a, b) => b.count - a.count)[0]?.name ?? null

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
      orders={orderList as any[]}
      stats={{ total_spent, order_count, delivery_rate, favorite_product }}
      updateCustomer={updateCustomer}
    />
  )
}
