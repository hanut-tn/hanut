import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics — Hanut',
  robots: { index: false, follow: false },
}

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { PLAN_LIMITS } from '@/lib/constants'
import { redirect } from 'next/navigation'
import AnalyticsClient from '@/components/analytics/AnalyticsClient'

type AnalyticsOrderRow = {
  id: string
  cod_amount: number
  quantity: number
  unit_cost: number
  status: string
  created_at: string
  product: { id: string; name: string } | { id: string; name: string }[] | null
  customer: { id: string; name: string; city?: string | null } | { id: string; name: string; city?: string | null }[] | null
}

type DeliveryOrderRow = {
  status: string
  cod_amount: number
  created_at: string
  seller_id: string
  deleted_at: string | null
}

type AnalyticsDeliveryRow = {
  delivery_type: 'self' | 'carrier'
  carrier: string | null
  fee: number | null
  cod_collected: boolean
  cod_reversed: boolean
  order: DeliveryOrderRow | DeliveryOrderRow[] | null
}

export default async function AnalyticsPage() {
  const context = await getUserContext()
  if (!context) return null
  if (context.role === 'operator') redirect('/orders')

  const supabase = await createServerClient()

  // Fenêtre temporelle selon le plan.
  const windowDays = PLAN_LIMITS[context.plan].analyticsDays
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)
  const iso = cutoff.toISOString()

  // Limite mémoire : évite de charger des dizaines de milliers de lignes.
  // Starter : 30j → 3 000 commandes max. Pro/Business : 180j → 10 000 max.
  const limit = context.plan === 'starter' ? 3000 : 10000

  const now = new Date().toISOString()
  const summaryPeriod = 30 as const
  const summaryCutoff = new Date()
  summaryCutoff.setDate(summaryCutoff.getDate() - summaryPeriod)
  summaryCutoff.setHours(0, 0, 0, 0)
  const summaryIso = summaryCutoff.toISOString()

  // Cast as unknown to prevent TypeScript from hanging on Supabase join generics.
  const [{ data: ordersRaw }, { data: deliveriesRaw }, { data: summaryRaw }] = (await Promise.all([
    supabase
      .from('orders')
      .select('id, cod_amount, quantity, unit_cost, status, created_at, product:products(id, name), customer:customers(id, name, city)')
      .eq('seller_id', context.sellerId)
      .is('deleted_at', null)
      .gte('created_at', iso)
      .order('created_at', { ascending: false })
      .limit(limit),
    // Filtrer les livraisons par leur propre created_at : une livraison est toujours
    // créée après la commande, donc ce filtre capture fidèlement la même période.
    supabase
      .from('deliveries')
      .select('delivery_type, carrier, fee, cod_collected, cod_reversed, order:orders(status, cod_amount, created_at, seller_id, deleted_at)')
      .gte('created_at', iso)
      .order('created_at', { ascending: false })
      .limit(limit),
    // Agrégats financiers côté serveur : exacts même si orders est tronqué.
    // Ils couvrent la période par défaut affichée dans le client (30 jours).
    supabase.rpc('get_analytics_summary', {
      p_seller_id: context.sellerId,
      p_start: summaryIso,
      p_end: now,
    }),
  ])) as unknown as [{ data: AnalyticsOrderRow[] | null }, { data: AnalyticsDeliveryRow[] | null }, { data: unknown }]

  // Détection de troncature : si on a atteint la limite, les données sont incomplètes.
  const truncated = (ordersRaw?.length ?? 0) >= limit

  const summary = summaryRaw && typeof summaryRaw === 'object' ? summaryRaw as {
    total_revenue: number
    total_fees: number
    total_cost: number
    order_count: number
    shipped_count: number
    delivered_count: number
    returned_count: number
    cancelled_count: number
  } : null

  // Filtre applicatif de sécurité (en complément du RLS sur deliveries).
  const sellerDeliveries = (deliveriesRaw ?? []).filter(d => {
    const o = Array.isArray(d.order) ? d.order[0] : d.order
    return o?.seller_id === context.sellerId && o?.deleted_at === null
  })

  return (
    <AnalyticsClient
      orders={ordersRaw ?? []}
      deliveries={sellerDeliveries}
      plan={context.plan}
      truncated={truncated}
      orderLimit={limit}
      summary={summary}
      summaryPeriod={summaryPeriod}
    />
  )
}
