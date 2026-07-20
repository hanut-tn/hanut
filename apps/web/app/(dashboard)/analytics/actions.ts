'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { PLAN_LIMITS } from '@/lib/constants'

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

// Point d'entrée unique pour charger l'analytics, appelé aussi bien par le
// chargement initial de la page que par chaque interaction client (période,
// dates personnalisées) — les garde-fous de plan ci-dessous s'appliquent
// donc dans tous les cas, pas seulement au premier rendu. Cf. audit limites
// de plan : la plage de dates et les données top_products/top_customers/
// top_zones ne doivent jamais atteindre le client pour le plan Starter, pas
// seulement être masquées côté UI.
export async function fetchAnalyticsData(from: string, to: string): Promise<AnalyticsData | null> {
  const context = await getUserContext()
  if (!context) return null

  const maxDays = PLAN_LIMITS[context.plan].analyticsDays
  const now = new Date()
  const minAllowed = new Date(now)
  minAllowed.setDate(minAllowed.getDate() - maxDays)

  const parsedFrom = new Date(from)
  const parsedTo = new Date(to)
  const clampedFrom = Number.isNaN(parsedFrom.getTime()) || parsedFrom < minAllowed ? minAllowed : parsedFrom
  const clampedTo = Number.isNaN(parsedTo.getTime()) || parsedTo > now ? now : parsedTo

  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('get_analytics_data', {
    p_seller_id: context.sellerId,
    p_from: clampedFrom.toISOString(),
    p_to: clampedTo.toISOString(),
  })

  if (error || !data) return null
  const result = data as AnalyticsData

  if (context.plan === 'starter') {
    return { ...result, top_products: [], top_customers: [], top_zones: [] }
  }
  return result
}
