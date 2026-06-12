import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Clients — Hanut',
  robots: { index: false, follow: false },
}

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import CustomersClient from '@/components/customers/CustomersClient'
import { updateCustomer, deleteCustomer } from './actions'

type Customers = Parameters<typeof CustomersClient>[0]['customers']

export default async function CustomersPage() {
  const context = await getUserContext()
  if (!context) return null

  const supabase = await createServerClient()

  const [{ data: customers, count: customersCount }, { data: allOrders }] = await Promise.all([
    supabase
      .from('customers')
      .select(`
        id, name, phone, address, city, created_at, tags,
        orders(id, cod_amount, status, created_at)
      `, { count: 'exact' })
      .eq('seller_id', context.sellerId)
      .is('orders.deleted_at', null)
      .order('name', { ascending: true })
      .range(0, 19),
    supabase
      .from('orders')
      .select('cod_amount, status')
      .eq('seller_id', context.sellerId)
      .is('deleted_at', null),
  ])

  const orderRows = allOrders ?? []
  const totalRevenue = orderRows
    .filter(order => order.status === 'delivered')
    .reduce((sum, order) => sum + order.cod_amount, 0)

  return (
    <CustomersClient
      customers={(customers ?? []) as Customers}
      initialTotal={customersCount ?? 0}
      plan={context.plan}
      stats={{ totalRevenue, orderCount: orderRows.length }}
      updateCustomer={updateCustomer}
      deleteCustomer={deleteCustomer}
    />
  )
}
