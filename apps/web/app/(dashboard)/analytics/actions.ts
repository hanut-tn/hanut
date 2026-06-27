'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'

export type AnalyticsSummary = {
  order_count: number
  delivered_count: number
  shipped_count: number
  returned_count: number
  cancelled_count: number
  total_revenue: number
  total_cost: number
  total_fees: number
  cod_pending: number
  has_missing_cost: boolean
}

export type AnalyticsPrevSummary = {
  order_count: number
  delivered_count: number
  shipped_count: number
  returned_count: number
  total_revenue: number
  total_cost: number
  total_fees: number
}

export type AnalyticsChartDay = {
  date: string
  order_count: number
  delivered_revenue: number
}

export type AnalyticsProductStat  = { id: string; name: string; revenue: number; count: number }
export type AnalyticsCustomerStat = { id: string; name: string; revenue: number; count: number }
export type AnalyticsZoneStat     = { zone: string; count: number }

export type AnalyticsCarrierStat = {
  key: string
  delivery_type: 'self' | 'carrier'
  shipped: number
  delivered: number
  cod_to_reverse: number
  cod_pending: number
  fees: number
}

export type AnalyticsData = {
  summary: AnalyticsSummary
  prev_summary: AnalyticsPrevSummary
  daily: AnalyticsChartDay[]
  by_status: Record<string, number>
  top_products: AnalyticsProductStat[]
  top_customers: AnalyticsCustomerStat[]
  top_zones: AnalyticsZoneStat[]
  carrier_stats: AnalyticsCarrierStat[]
}

export async function fetchAnalyticsData(from: string, to: string): Promise<AnalyticsData | null> {
  const context = await getUserContext()
  if (!context) return null

  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('get_analytics_data', {
    p_seller_id: context.sellerId,
    p_from: from,
    p_to: to,
  })

  if (error || !data) return null
  return data as AnalyticsData
}
