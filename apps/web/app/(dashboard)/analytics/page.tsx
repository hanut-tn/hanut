import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics — Hanut',
  robots: { index: false, follow: false },
}

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { redirect } from 'next/navigation'
import AnalyticsClient from '@/components/analytics/AnalyticsClient'
import { fetchAnalyticsData } from './actions'
import type { AnalyticsData } from './actions'

const EMPTY_DATA: AnalyticsData = {
  summary: {
    order_count: 0, delivered_count: 0, shipped_count: 0, returned_count: 0,
    cancelled_count: 0, total_revenue: 0, total_cost: 0, total_fees: 0,
    cod_pending: 0, has_missing_cost: false,
  },
  prev_summary: {
    order_count: 0, delivered_count: 0, shipped_count: 0, returned_count: 0,
    total_revenue: 0, total_cost: 0, total_fees: 0,
  },
  daily: [], by_status: {}, top_products: [], top_customers: [],
  top_zones: [], carrier_stats: [],
}

export default async function AnalyticsPage() {
  const context = await getUserContext()
  if (!context) return null
  if (context.role === 'operator') redirect('/orders')

  const supabase = await createServerClient()

  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - 30)
  from.setHours(0, 0, 0, 0)

  const { data: raw } = await supabase.rpc('get_analytics_data', {
    p_seller_id: context.sellerId,
    p_from: from.toISOString(),
    p_to: now.toISOString(),
  })

  return (
    <AnalyticsClient
      initialData={(raw as AnalyticsData) ?? EMPTY_DATA}
      plan={context.plan}
      loadData={fetchAnalyticsData}
    />
  )
}
