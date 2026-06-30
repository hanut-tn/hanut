import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tableau de bord — Hanut',
  robots: { index: false, follow: false },
}

import { unstable_cache } from 'next/cache'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import {
  normalizeAnalyticsSummary,
  type AnalyticsSummary,
} from '@/lib/dashboard-analytics'
import Link from 'next/link'
import {
  ShoppingBag, Banknote, TrendingUp, TrendingDown, Clock,
  Plus, Package, Truck,
} from 'lucide-react'
import CopyLinkButton from '@/components/dashboard/CopyLinkButton'
import OnboardingChecklist from '@/components/dashboard/OnboardingChecklist'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { OperatorDashboard } from '@/components/dashboard/OperatorDashboard'
import { ReadonlyDashboard } from '@/components/dashboard/ReadonlyDashboard'
import { initials } from '@/lib/utils'
import LowStockWidget from '@/components/dashboard/LowStockWidget'
import { adjustStock } from '@/app/(dashboard)/catalog/actions'
import { createRestockOrder } from '@/app/(dashboard)/catalog/restock-actions'

type RecentOrder = {
  id: string
  cod_amount: number
  status: string
  variant?: string | null
  created_at: string
  customer: { name: string; phone: string } | { name: string; phone: string }[] | null
  product: { name: string } | { name: string }[] | null
}

type ServiceClient = ReturnType<typeof createServiceClient>

async function loadAnalyticsSummary(
  supabase: ServiceClient,
  sellerId: string,
  start: string,
  end: string,
): Promise<AnalyticsSummary> {
  const rpcResult = await supabase.rpc('get_dashboard_kpis', {
    p_seller_id: sellerId,
    p_start: start,
    p_end: end,
  })
  const rpcSummary = normalizeAnalyticsSummary(rpcResult.data)

  if (!rpcResult.error && rpcSummary) return rpcSummary

  const rpcError = rpcResult.error?.message ?? 'La RPC a retourné une réponse vide.'
  console.error('[dashboard] get_dashboard_kpis failed, using legacy analytics fallback:', rpcError)
  Sentry.captureException(new Error(`Dashboard KPI RPC failed: ${rpcError}`), {
    extra: { sellerId, start, end },
  })

  // Compatibilité pendant le déploiement : l'ancienne RPC reste un agrégat
  // SQL non borné et évite de casser le dashboard avant application de la
  // migration 20260704.
  const legacyResult = await supabase.rpc('get_analytics_summary', {
    p_seller_id: sellerId,
    p_start: start,
    p_end: end,
  })

  if (legacyResult.error) {
    throw new Error(`Impossible de charger les KPI du dashboard : ${legacyResult.error.message}`)
  }

  const fallback = normalizeAnalyticsSummary(legacyResult.data)
  if (!fallback) {
    throw new Error('Impossible de charger les KPI du dashboard : réponse vide.')
  }

  return fallback
}

// Crée un cache scopé par seller — chaque vendeur a son propre tag.
// revalidateTag(`dashboard-${sellerId}`) n'invalide que ce vendeur,
// pas le cache de 500 autres vendeurs actifs.
function getDashboardData(sellerId: string) {
  return unstable_cache(
    async () => {
      const supabase = createServiceClient()

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const [
        currentStats,
        lastMonthStats,
        { count: codPendingCount },
        { data: weeklyOrders },
        { data: recentOrders },
        { data: seller },
        { count: productCount },
        { count: orderCount },
        { data: stockProducts },
      ] = await Promise.all([
        // KPIs mois en cours — agrégés en SQL, pas de chargement en mémoire.
        loadAnalyticsSummary(
          supabase,
          sellerId,
          startOfMonth.toISOString(),
          now.toISOString(),
        ),
        // KPIs mois précédent pour les tendances.
        loadAnalyticsSummary(
          supabase,
          sellerId,
          startOfLastMonth.toISOString(),
          endOfLastMonth.toISOString(),
        ),
        // Commandes en transit ce mois (confirmées ou expédiées).
        supabase.from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', sellerId)
          .is('deleted_at', null)
          .in('status', ['confirmed', 'shipped'])
          .gte('created_at', startOfMonth.toISOString()),
        // Graphique 7 jours — déjà filtré par status=delivered, borne de sécurité ajoutée.
        supabase.from('orders')
          .select('cod_amount, created_at')
          .eq('seller_id', sellerId)
          .eq('status', 'delivered')
          .is('deleted_at', null)
          .gte('created_at', sevenDaysAgo.toISOString())
          .limit(500),
        supabase.from('orders').select('id, cod_amount, status, variant, created_at, customer:customers(name, phone), product:products(name)').eq('seller_id', sellerId).is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
        supabase.from('sellers').select('slug, onboarding_completed, onboarding_steps, onboarding_dismissed_until').eq('id', sellerId).single(),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', sellerId),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('seller_id', sellerId).is('deleted_at', null),
        supabase.from('products').select('id, name, stock, low_stock_alert, image_url, price, cost').eq('seller_id', sellerId).order('stock', { ascending: true }).limit(50),
      ])

      return { currentStats, lastMonthStats, codPendingCount, weeklyOrders, recentOrders, seller, productCount, orderCount, stockProducts }
    },
    [`dashboard-${sellerId}`],
    { revalidate: 60, tags: [`dashboard-${sellerId}`] }
  )
}

export default async function DashboardPage() {
  const context = await getUserContext()
  if (!context) return null

  if (context.role === 'operator') return <OperatorDashboard context={context} />
  if (context.role === 'readonly') return <ReadonlyDashboard context={context} />

  const {
    currentStats, lastMonthStats, codPendingCount,
    weeklyOrders, recentOrders, seller, productCount, orderCount, stockProducts,
  } = await getDashboardData(context.sellerId)()

  // Current month KPIs — calculés depuis la RPC (agrégats SQL, pas de tableau en mémoire)
  const revenue = currentStats.total_revenue
  const ordersThisMonth = currentStats.order_count
  const shippedTotal = currentStats.shipped_count + currentStats.delivered_count + currentStats.returned_count
  const deliveryRate = shippedTotal > 0 ? Math.round(currentStats.delivered_count / shippedTotal * 100) : 0

  // Last month KPIs for trend
  const lastRevenue = lastMonthStats.total_revenue
  const lastOrdersCount = lastMonthStats.order_count
  const lastShippedTotal = lastMonthStats.shipped_count + lastMonthStats.delivered_count + lastMonthStats.returned_count
  const lastDeliveryRate = lastShippedTotal > 0 ? Math.round(lastMonthStats.delivered_count / lastShippedTotal * 100) : 0

  function trend(current: number, previous: number): 'up' | 'down' | 'flat' {
    if (previous === 0) return current > 0 ? 'up' : 'flat'
    return current >= previous ? 'up' : 'down'
  }

  function trendPct(current: number, previous: number): string {
    if (previous === 0) return ''
    const pct = Math.round(((current - previous) / previous) * 100)
    return `${pct > 0 ? '+' : ''}${pct}%`
  }

  // Weekly bar chart data
  const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dateStr = date.toISOString().slice(0, 10)
    const dayRevenue = ((weeklyOrders ?? []) as { cod_amount: number; created_at: string }[])
      .filter(o => o.created_at.slice(0, 10) === dateStr)
      .reduce((s, o) => s + o.cod_amount, 0)
    return {
      day: i === 6 ? 'Auj.' : DAY_LABELS[date.getDay()],
      value: dayRevenue,
    }
  })
  const chartMax = Math.max(...chartData.map(d => d.value), 1)
  const hasWeeklyData = chartData.some(d => d.value > 0)
  const onboardingSteps = seller?.onboarding_steps as { link_copied?: boolean; first_order?: boolean } | null

  // COD pending — count query scopée ce mois (même périmètre que l'ancienne formule)
  const codPending = codPendingCount ?? 0
  const lowStockProducts = ((stockProducts ?? []) as Parameters<typeof LowStockWidget>[0]['products'])
    .filter(product => product.stock === 0 || product.stock <= product.low_stock_alert)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1917]">Tableau de bord</h1>
          <p className="text-sm text-[#78716C] mt-0.5">Vue d&apos;ensemble du mois en cours</p>
        </div>
        <Link href="/orders/new" className="btn-primary w-full text-center text-sm sm:w-auto">+ Nouvelle commande</Link>
      </div>

      {/* Onboarding checklist — visible uniquement aux vendeurs n'ayant pas encore terminé */}
      {context.isSeller && !seller?.onboarding_completed &&
       (!seller?.onboarding_dismissed_until || new Date(seller.onboarding_dismissed_until) < new Date()) && (
        <OnboardingChecklist
          productAdded={(productCount ?? 0) > 0}
          slugCreated={!!seller?.slug}
          linkCopied={onboardingSteps?.link_copied === true}
          firstOrder={(orderCount ?? 0) > 0 || onboardingSteps?.first_order === true}
          slug={seller?.slug ?? null}
        />
      )
      }

      {(orderCount ?? 0) === 0 && (
        <div className="flex items-start gap-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-3 text-sm text-[#15803D]">
          <ShoppingBag className="w-5 h-5 shrink-0 mt-0.5" />
          <span>Bienvenue ! Créez votre première commande pour commencer à suivre vos ventes.</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          label="Commandes"
          value={String(ordersThisMonth)}
          sub="ce mois-ci"
          icon={ShoppingBag}
          trend={trend(ordersThisMonth, lastOrdersCount)}
          trendLabel={trendPct(ordersThisMonth, lastOrdersCount)}
        />
        <KPICard
          label="CA livré"
          value={`${revenue.toFixed(0)} DT`}
          sub="commandes livrées"
          icon={Banknote}
          valueClass="text-[#16A34A]"
          trend={trend(revenue, lastRevenue)}
          trendLabel={trendPct(revenue, lastRevenue)}
        />
        <KPICard
          label="Taux livraison"
          value={`${deliveryRate}%`}
          sub="sur expéditions"
          icon={TrendingUp}
          trend={trend(deliveryRate, lastDeliveryRate)}
          trendLabel={trendPct(deliveryRate, lastDeliveryRate)}
        />
        <KPICard
          label="En transit"
          value={String(codPending)}
          sub="confirmées ou expédiées"
          icon={Clock}
          valueClass="text-amber-600"
          trend="flat"
          trendLabel=""
        />
      </div>

      {/* Weekly chart + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-[#1C1917]">Évolution cette semaine</h2>
              <p className="text-xs text-[#78716C]">Chiffre d&apos;affaires livré — 7 derniers jours</p>
            </div>
          </div>
          {hasWeeklyData ? (
            <svg
              viewBox="0 0 700 132"
              role="img"
              aria-label="Évolution du chiffre d'affaires livré sur les 7 derniers jours"
              className="w-full h-32"
            >
              <line x1="24" y1="104" x2="676" y2="104" stroke="#E7E5E4" strokeWidth="1" />
              {chartData.map(({ day, value }, index) => {
                const slot = 92
                const barWidth = 44
                const x = 24 + index * slot + (slot - barWidth) / 2
                const height = value > 0 ? Math.max((value / chartMax) * 88, 4) : 0
                const y = 104 - height

                return (
                  <g key={day}>
                    {value > 0 ? (
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={height}
                        rx="6"
                        fill="#16A34A"
                      >
                        <title>{day}: {value} DT</title>
                      </rect>
                    ) : (
                      <line x1={x} y1="104" x2={x + barWidth} y2="104" stroke="#E7E5E4" strokeWidth="3" strokeLinecap="round" />
                    )}
                    <text
                      x={x + barWidth / 2}
                      y="124"
                      textAnchor="middle"
                      fontSize="11"
                      fill="#78716C"
                    >
                      {day}
                    </text>
                  </g>
                )
              })}
            </svg>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-center gap-1">
              <TrendingUp className="w-8 h-8 text-[#E7E5E4]" />
              <p className="text-sm text-[#78716C]">Aucune vente livrée cette semaine</p>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-[#1C1917] mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/orders/new"
              className="flex flex-col items-center gap-2 p-4 border border-[#E7E5E4] rounded-xl hover:bg-[#F5F5F4] hover:border-[#D6D3D1] transition-colors text-center"
            >
              <div className="w-9 h-9 bg-[#F0FDF4] rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-[#16A34A]" />
              </div>
              <span className="text-xs font-medium text-[#1C1917] leading-tight">Nouvelle commande</span>
            </Link>
            <Link
              href="/catalog"
              className="flex flex-col items-center gap-2 p-4 border border-[#E7E5E4] rounded-xl hover:bg-[#F5F5F4] hover:border-[#D6D3D1] transition-colors text-center"
            >
              <div className="w-9 h-9 bg-[#F0FDF4] rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-[#16A34A]" />
              </div>
              <span className="text-xs font-medium text-[#1C1917] leading-tight">Ajouter un produit</span>
            </Link>
            <CopyLinkButton slug={seller?.slug ?? null} />
            <Link

              href="/deliveries"
              className="flex flex-col items-center gap-2 p-4 border border-[#E7E5E4] rounded-xl hover:bg-[#F5F5F4] hover:border-[#D6D3D1] transition-colors text-center"
            >
              <div className="w-9 h-9 bg-[#F0FDF4] rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5 text-[#16A34A]" />
              </div>
              <span className="text-xs font-medium text-[#1C1917] leading-tight">Livraisons</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Low stock widget */}
      {lowStockProducts.length > 0 && (
        <LowStockWidget
          products={lowStockProducts}
          adjustStock={adjustStock}
          createRestockOrder={createRestockOrder}
        />
      )}

      {/* Recent orders */}
      <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#1C1917]">Commandes récentes</h2>
          <Link href="/orders" className="text-sm text-[#16A34A] hover:text-[#15803D] font-medium transition-colors">
            Voir tout →
          </Link>
        </div>
        <RecentOrders orders={(recentOrders ?? []) as RecentOrder[]} />
      </div>
    </div>
  )
}

/* ─── Sub-components ─── */

function KPICard({
  label, value, sub, icon: Icon, valueClass = 'text-[#1C1917]', trend, trendLabel,
}: {
  label: string
  value: string
  sub: string
  icon: React.ElementType
  valueClass?: string
  trend: 'up' | 'down' | 'flat'
  trendLabel: string
}) {
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-xl p-3 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs sm:text-sm font-medium text-[#78716C] leading-tight">{label}</p>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#78716C] shrink-0" />
      </div>
      <p className={`text-2xl sm:text-3xl font-bold mt-2 ${valueClass}`}>{value}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-[#78716C]">{sub}</p>
        {trendLabel && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${
            trend === 'up' ? 'text-[#16A34A]' : trend === 'down' ? 'text-red-500' : 'text-[#78716C]'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  )
}

function RecentOrders({ orders }: { orders: RecentOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-[#78716C]">
        <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-30" />
        <p className="font-medium text-[#1C1917]">Aucune commande pour l&apos;instant</p>
        <p className="text-sm mt-1">Créez votre première commande</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#E7E5E4]">
      {orders.map(order => {
        const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer
        const product = Array.isArray(order.product) ? order.product[0] : order.product
        const ini = customer?.name ? initials(customer.name) : '?'

        return (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="flex items-center gap-4 py-3 hover:bg-[#FAFAF9] -mx-6 px-6 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-[#F0FDF4] text-[#166534] flex items-center justify-center font-semibold text-xs shrink-0 select-none">
              {ini}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#1C1917] text-sm truncate">{customer?.name ?? '—'}</p>
              <p className="text-xs text-[#78716C] truncate">{product?.name ?? '—'}{order.variant ? ` · ${order.variant}` : ''}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-[#16A34A]">{order.cod_amount} DT</p>
              <div className="mt-0.5">
                <StatusBadge status={order.status} />
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
