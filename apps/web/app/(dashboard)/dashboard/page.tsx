import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
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

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffHours < 1) return 'à l\'instant'
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays === 1) return 'hier'
  return date.toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

export default async function DashboardPage() {
  const context = await getUserContext()
  if (!context) return null

  if (context.role === 'operator') return <OperatorDashboard context={context} />
  if (context.role === 'readonly') return <ReadonlyDashboard context={context} />

  const supabase = await createServerClient()

  // Date boundaries
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    { data: allDelivered },
    { data: allOrders },
    { data: lastMonthDelivered },
    { data: lastMonthOrders },
    { data: weeklyOrders },
    { data: recentOrders },
    { data: seller },
    { count: productCount },
    { count: orderCount },
  ] = await Promise.all([
    supabase.from('orders').select('cod_amount, created_at').eq('seller_id', context.sellerId).eq('status', 'delivered').is('deleted_at', null).gte('created_at', startOfMonth.toISOString()),
    supabase.from('orders').select('status').eq('seller_id', context.sellerId).is('deleted_at', null).gte('created_at', startOfMonth.toISOString()),
    supabase.from('orders').select('cod_amount').eq('seller_id', context.sellerId).eq('status', 'delivered').is('deleted_at', null).gte('created_at', startOfLastMonth.toISOString()).lte('created_at', endOfLastMonth.toISOString()),
    supabase.from('orders').select('status').eq('seller_id', context.sellerId).is('deleted_at', null).gte('created_at', startOfLastMonth.toISOString()).lte('created_at', endOfLastMonth.toISOString()),
    supabase.from('orders').select('cod_amount, created_at').eq('seller_id', context.sellerId).eq('status', 'delivered').is('deleted_at', null).gte('created_at', sevenDaysAgo.toISOString()),
    supabase.from('orders').select('id, cod_amount, status, variant, created_at, customer:customers(name, phone), product:products(name)').eq('seller_id', context.sellerId).is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
    supabase.from('sellers').select('slug, onboarding_completed, onboarding_steps').eq('id', context.sellerId).single(),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', context.sellerId),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('seller_id', context.sellerId).is('deleted_at', null),
  ])

  // Current month KPIs
  const revenue = ((allDelivered ?? []) as { cod_amount: number }[]).reduce((s, o) => s + o.cod_amount, 0)
  const all = (allOrders ?? []) as { status: string }[]
  const shipped = all.filter(o => ['shipped', 'delivered', 'returned'].includes(o.status)).length
  const deliveryRate = shipped > 0 ? Math.round((all.filter(o => o.status === 'delivered').length / shipped) * 100) : 0
  const ordersThisMonth = all.length

  // Last month KPIs for trend
  const lastRevenue = ((lastMonthDelivered ?? []) as { cod_amount: number }[]).reduce((s, o) => s + o.cod_amount, 0)
  const lastAll = (lastMonthOrders ?? []) as { status: string }[]
  const lastShipped = lastAll.filter(o => ['shipped', 'delivered', 'returned'].includes(o.status)).length
  const lastDeliveryRate = lastShipped > 0 ? Math.round((lastAll.filter(o => o.status === 'delivered').length / lastShipped) * 100) : 0
  const lastOrdersCount = lastAll.length

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

  // COD pending (orders confirmed or shipped — not yet delivered/reversed)
  const codPending = ((allOrders ?? []) as any[])
    .filter((o: any) => ['confirmed', 'shipped'].includes(o.status))
    .length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Tableau de bord</h1>
          <p className="text-sm text-[#78716C] mt-0.5">Vue d&apos;ensemble du mois en cours</p>
        </div>
        <Link href="/orders/new" className="btn-primary w-full text-center text-sm sm:w-auto">+ Nouvelle commande</Link>
      </div>

      {/* Onboarding checklist — visible uniquement aux vendeurs n'ayant pas encore terminé */}
      {context.isSeller && !seller?.onboarding_completed && (
        <OnboardingChecklist
          productAdded={(productCount ?? 0) > 0}
          linkCopied={(seller?.onboarding_steps as { link_copied?: boolean } | null)?.link_copied === true}
          firstOrder={(orderCount ?? 0) > 0}
          slug={seller?.slug ?? null}
        />
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

      {/* Recent orders */}
      <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#1C1917]">Commandes récentes</h2>
          <Link href="/orders" className="text-sm text-[#16A34A] hover:text-[#15803D] font-medium transition-colors">
            Voir tout →
          </Link>
        </div>
        <RecentOrders orders={recentOrders as any[] ?? []} />
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

function RecentOrders({ orders }: { orders: any[] }) {
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
      {orders.map((order: any) => {
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
