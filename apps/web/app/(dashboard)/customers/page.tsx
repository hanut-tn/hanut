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

  const now = new Date().toISOString()

  const [
    { data: customers, count: customersCount },
    { count: orderCount },
    { data: revenueRaw },
  ] = await Promise.all([
    // Pas de JOIN orders — order_count/total_spent viennent des colonnes dénormalisées.
    supabase
      .from('customers')
      .select('id, name, phone, address, city, created_at, tags, order_count, total_spent_calc:total_spent, last_order_at', { count: 'exact' })
      .eq('seller_id', context.sellerId)
      .order('name', { ascending: true })
      .range(0, 19),
    // Nombre total de commandes actives — count only, zéro données chargées.
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', context.sellerId)
      .is('deleted_at', null),
    // CA total livré — agrégé en SQL via la RPC get_analytics_summary (all-time).
    supabase.rpc('get_analytics_summary', {
      p_seller_id: context.sellerId,
      p_start:     '2020-01-01T00:00:00.000Z',
      p_end:       now,
    }),
  ])

  type RevenueSummary = { total_revenue?: number }
  const totalRevenue = ((revenueRaw ?? {}) as RevenueSummary).total_revenue ?? 0

  return (
    <CustomersClient
      customers={(customers ?? []) as Customers}
      initialTotal={customersCount ?? 0}
      plan={context.plan}
      stats={{ totalRevenue, orderCount: orderCount ?? 0 }}
      updateCustomer={updateCustomer}
      deleteCustomer={deleteCustomer}
    />
  )
}
