import { createServerClient } from '@/lib/supabase/server'
import { ShoppingBag, Banknote, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'

type Context = { sellerId: string }
type Relation<T> = T | T[] | null
type CustomerSummary = { name: string; phone: string }
type ProductSummary = { name: string }
type ReadonlyOrder = {
  id: string
  cod_amount: number
  status: string
  variant?: string | null
  created_at: string
  customer: Relation<CustomerSummary>
  product: Relation<ProductSummary>
}

function relativeDate(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffHours < 1) return 'à l\'instant'
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays === 1) return 'hier'
  return new Date(dateStr).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

export async function ReadonlyDashboard({ context }: { context: Context }) {
  const supabase = await createServerClient()

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
  ] = await Promise.all([
    supabase.from('orders').select('cod_amount').eq('seller_id', context.sellerId).eq('status', 'delivered').is('deleted_at', null).gte('created_at', startOfMonth.toISOString()),
    supabase.from('orders').select('status').eq('seller_id', context.sellerId).is('deleted_at', null).gte('created_at', startOfMonth.toISOString()),
    supabase.from('orders').select('cod_amount').eq('seller_id', context.sellerId).eq('status', 'delivered').is('deleted_at', null).gte('created_at', startOfLastMonth.toISOString()).lte('created_at', endOfLastMonth.toISOString()),
    supabase.from('orders').select('status').eq('seller_id', context.sellerId).is('deleted_at', null).gte('created_at', startOfLastMonth.toISOString()).lte('created_at', endOfLastMonth.toISOString()),
    supabase.from('orders').select('cod_amount, created_at').eq('seller_id', context.sellerId).eq('status', 'delivered').is('deleted_at', null).gte('created_at', sevenDaysAgo.toISOString()),
    supabase.from('orders').select('id, cod_amount, status, variant, created_at, customer:customers(name, phone), product:products(name)').eq('seller_id', context.sellerId).is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
  ])

  const revenue = ((allDelivered ?? []) as { cod_amount: number }[]).reduce((s, o) => s + o.cod_amount, 0)
  const all = (allOrders ?? []) as { status: string }[]
  const shipped = all.filter(o => ['shipped', 'delivered', 'returned'].includes(o.status)).length
  const deliveryRate = shipped > 0 ? Math.round((all.filter(o => o.status === 'delivered').length / shipped) * 100) : 0
  const ordersThisMonth = all.length
  const codPending = all.filter(o => ['confirmed', 'shipped'].includes(o.status)).length

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

  const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dateStr = date.toISOString().slice(0, 10)
    const dayRevenue = ((weeklyOrders ?? []) as { cod_amount: number; created_at: string }[])
      .filter(o => o.created_at.slice(0, 10) === dateStr)
      .reduce((s, o) => s + o.cod_amount, 0)
    return { day: i === 6 ? 'Auj.' : DAY_LABELS[date.getDay()], value: dayRevenue }
  })
  const chartMax = Math.max(...chartData.map(d => d.value), 1)
  const hasWeeklyData = chartData.some(d => d.value > 0)
  const recentOrderRows = (recentOrders ?? []) as ReadonlyOrder[]

  const kpis = [
    { label: 'Commandes', value: String(ordersThisMonth), sub: 'ce mois-ci', icon: ShoppingBag, valueClass: 'text-[#1C1917]', trendDir: trend(ordersThisMonth, lastOrdersCount), trendLabel: trendPct(ordersThisMonth, lastOrdersCount) },
    { label: 'CA livré', value: `${revenue.toFixed(0)} DT`, sub: 'commandes livrées', icon: Banknote, valueClass: 'text-[#16A34A]', trendDir: trend(revenue, lastRevenue), trendLabel: trendPct(revenue, lastRevenue) },
    { label: 'Taux livraison', value: `${deliveryRate}%`, sub: 'sur expéditions', icon: TrendingUp, valueClass: 'text-[#1C1917]', trendDir: trend(deliveryRate, lastDeliveryRate), trendLabel: trendPct(deliveryRate, lastDeliveryRate) },
    { label: 'En transit', value: String(codPending), sub: 'confirmées ou expédiées', icon: Clock, valueClass: 'text-amber-600', trendDir: 'flat' as const, trendLabel: '' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1C1917]">Tableau de bord</h1>
        <p className="text-sm text-[#78716C] mt-0.5">Vue d&apos;ensemble du mois en cours</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="bg-white border border-[#E7E5E4] rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-[#78716C]">{kpi.label}</p>
                <Icon className="w-5 h-5 text-[#78716C]" />
              </div>
              <p className={`text-3xl font-bold mt-2 ${kpi.valueClass}`}>{kpi.value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-[#78716C]">{kpi.sub}</p>
                {kpi.trendLabel && (
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${
                    kpi.trendDir === 'up' ? 'text-[#16A34A]' : kpi.trendDir === 'down' ? 'text-red-500' : 'text-[#78716C]'
                  }`}>
                    {kpi.trendDir === 'up' ? <TrendingUp className="w-3 h-3" /> : kpi.trendDir === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
                    {kpi.trendLabel}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Weekly chart */}
      <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-[#1C1917]">Évolution cette semaine</h2>
          <p className="text-xs text-[#78716C]">Chiffre d&apos;affaires livré — 7 derniers jours</p>
        </div>
        {hasWeeklyData ? (
          <svg viewBox="0 0 700 132" role="img" aria-label="Évolution du CA livré sur 7 jours" className="w-full h-32">
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
                    <rect x={x} y={y} width={barWidth} height={height} rx="6" fill="#16A34A">
                      <title>{day}: {value} DT</title>
                    </rect>
                  ) : (
                    <line x1={x} y1="104" x2={x + barWidth} y2="104" stroke="#E7E5E4" strokeWidth="3" strokeLinecap="round" />
                  )}
                  <text x={x + barWidth / 2} y="124" textAnchor="middle" fontSize="11" fill="#78716C">{day}</text>
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

      {/* Recent orders — read only */}
      <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#1C1917]">Commandes récentes</h2>
        </div>

        {recentOrderRows.length === 0 ? (
          <div className="text-center py-12 text-[#78716C]">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-30" />
            <p className="font-medium text-[#1C1917]">Aucune commande pour l&apos;instant</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E7E5E4]">
            {recentOrderRows.map(order => {
              const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer
              const product = Array.isArray(order.product) ? order.product[0] : order.product
              const ini = customer?.name ? initials(customer.name) : '?'
              return (
                <div key={order.id} className="flex items-center gap-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-[#F0FDF4] text-[#166534] flex items-center justify-center font-semibold text-xs shrink-0 select-none">
                    {ini}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1C1917] text-sm truncate">{customer?.name ?? '—'}</p>
                    <p className="text-xs text-[#78716C] truncate">{product?.name ?? '—'}{order.variant ? ` · ${order.variant}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#16A34A]">{order.cod_amount} DT</p>
                    <p className="text-xs text-[#78716C] mt-0.5">{relativeDate(order.created_at)}</p>
                  </div>
                  <span className="hidden sm:inline-flex">
                    <StatusBadge status={order.status} />
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
