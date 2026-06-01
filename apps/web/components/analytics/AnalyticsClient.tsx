'use client'

import { useState, useMemo } from 'react'

type Order = {
  id: string
  cod_amount: number
  status: string
  created_at: string
  product?: { id: string; name: string } | { id: string; name: string }[]
}

type OrderWithCity = {
  id: string
  cod_amount: number
  status: string
  created_at: string
  customer?: { city?: string } | { city?: string }[]
}

type DeliveryInfo = {
  fee?: number
  cod_collected: boolean
  cod_reversed: boolean
}

type Props = {
  orders: Order[]
  ordersWithCity: OrderWithCity[]
  deliveries: DeliveryInfo[]
}

type Period = 7 | 30 | 90

const PERIOD_LABELS: Record<Period, string> = { 7: '7 jours', 30: '30 jours', 90: '90 jours' }

const STATUS_COLOR: Record<string, string> = {
  new:       'bg-blue-400',
  confirmed: 'bg-yellow-400',
  shipped:   'bg-purple-400',
  delivered: 'bg-green-400',
  returned:  'bg-red-400',
}
const STATUS_LABEL: Record<string, string> = {
  new: 'Nouvelles', confirmed: 'Confirmées', shipped: 'Expédiées',
  delivered: 'Livrées', returned: 'Retournées',
}

function getCity(o: OrderWithCity): string | undefined {
  const c = Array.isArray(o.customer) ? o.customer[0] : o.customer
  return c?.city ?? undefined
}

function getProduct(o: Order): { id: string; name: string } | null {
  const p = Array.isArray(o.product) ? o.product[0] : o.product
  return p ?? null
}

export default function AnalyticsClient({ orders, ordersWithCity, deliveries }: Props) {
  const [period, setPeriod] = useState<Period>(30)

  const cutoff = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - period)
    d.setHours(0, 0, 0, 0)
    return d
  }, [period])

  const filtered = useMemo(() =>
    orders.filter(o => new Date(o.created_at) >= cutoff),
    [orders, cutoff]
  )

  const filteredWithCity = useMemo(() =>
    ordersWithCity.filter(o => new Date(o.created_at) >= cutoff),
    [ordersWithCity, cutoff]
  )

  // KPIs
  const delivered    = filtered.filter(o => o.status === 'delivered')
  const revenue      = delivered.reduce((s, o) => s + o.cod_amount, 0)
  const totalOrders  = filtered.length
  const shipped      = filtered.filter(o => ['shipped', 'delivered', 'returned'].includes(o.status))
  const deliveryRate = shipped.length > 0
    ? Math.round(delivered.length / shipped.length * 100) : 0
  const returnRate   = shipped.length > 0
    ? Math.round(filtered.filter(o => o.status === 'returned').length / shipped.length * 100) : 0
  const codPending   = filtered
    .filter(o => ['new', 'confirmed', 'shipped'].includes(o.status))
    .reduce((s, o) => s + o.cod_amount, 0)

  // Status distribution
  const statusCounts: Record<string, number> = {}
  for (const o of filtered) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1
  }
  const maxStatusCount = Math.max(...Object.values(statusCounts), 1)

  // Top 5 products by revenue
  const productMap: Record<string, { name: string; revenue: number; count: number }> = {}
  for (const o of filtered) {
    const p = getProduct(o)
    if (p) {
      if (!productMap[p.id]) productMap[p.id] = { name: p.name, revenue: 0, count: 0 }
      productMap[p.id].revenue += o.cod_amount
      productMap[p.id].count  += 1
    }
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
  const maxProductRevenue = Math.max(...topProducts.map(p => p.revenue), 1)

  // Top 5 cities
  const cityMap: Record<string, number> = {}
  for (const o of filteredWithCity) {
    const city = getCity(o)
    if (city) cityMap[city] = (cityMap[city] ?? 0) + 1
  }
  const topCities = Object.entries(cityMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxCityCount = Math.max(...topCities.map(c => c[1]), 1)

  // Daily chart data
  const dailyData = useMemo(() => {
    const days: { label: string; orders: number; revenue: number }[] = []
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayOrders = filtered.filter(o => o.created_at.startsWith(dateStr))
      days.push({
        label: d.toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' }),
        orders: dayOrders.length,
        revenue: dayOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.cod_amount, 0),
      })
    }
    return days
  }, [filtered, period])

  const maxDailyOrders = Math.max(...dailyData.map(d => d.orders), 1)

  return (
    <div className="space-y-6">
      {/* Header + period */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytiques</h1>
          <p className="text-sm text-gray-500 mt-0.5">Basé sur les {period} derniers jours</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([7, 30, 90] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'CA encaissé',     value: `${revenue.toFixed(0)} DT`,      sub: `${delivered.length} commandes livrées`, icon: '💰', color: 'bg-green-50 text-green-600' },
          { label: 'Commandes',       value: String(totalOrders),              sub: 'sur la période',                        icon: '📦', color: 'bg-blue-50 text-blue-600' },
          { label: 'Taux livraison',  value: `${deliveryRate}%`,               sub: `Retours: ${returnRate}%`,               icon: '🚚', color: 'bg-purple-50 text-purple-600' },
          { label: 'COD en attente',  value: `${codPending.toFixed(0)} DT`,   sub: 'non encore livré',                      icon: '⏳', color: 'bg-orange-50 text-orange-500' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${s.color}`}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Commandes par jour</h2>
        {totalOrders === 0 ? (
          <div className="h-28 flex items-center justify-center text-gray-400 text-sm">
            Aucune commande sur cette période
          </div>
        ) : (
          <div className="flex items-end gap-0.5 h-28">
            {dailyData.map((d, i) => (
              <div
                key={i}
                className="flex-1 relative group"
                style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}
              >
                <div
                  className="w-full rounded-t-sm bg-brand-200 hover:bg-brand-400 transition-colors cursor-default"
                  style={{ height: `${Math.max(d.orders > 0 ? 4 : 0, (d.orders / maxDailyOrders) * 100)}%` }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-gray-900 text-white text-[11px] rounded-md px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {d.label}: {d.orders} cmd{d.revenue > 0 ? ` · ${d.revenue.toFixed(0)} DT` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* X-axis labels — only show a few */}
        {totalOrders > 0 && period <= 30 && (
          <div className="flex mt-1">
            {dailyData.map((d, i) => {
              const show = period <= 7 || (i % Math.ceil(period / 7) === 0)
              return (
                <div key={i} className="flex-1 text-center">
                  {show && <span className="text-[9px] text-gray-400">{d.label}</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Status distribution */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Répartition des statuts</h2>
          {totalOrders === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {(['new', 'confirmed', 'shipped', 'delivered', 'returned'] as const).map(s => {
                const count = statusCounts[s] ?? 0
                const pct = Math.round((count / maxStatusCount) * 100)
                return (
                  <div key={s}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{STATUS_LABEL[s]}</span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${STATUS_COLOR[s]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Top produits</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => {
                const pct = Math.round((p.revenue / maxProductRevenue) * 100)
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 truncate max-w-[60%]">{p.name}</span>
                      <span className="text-sm font-medium text-gray-900 ml-2 flex-shrink-0">
                        {p.revenue.toFixed(0)} DT
                        <span className="text-xs text-gray-400 font-normal ml-1">({p.count})</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top cities */}
        <div className="card p-5 xl:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">Top villes</h2>
          {topCities.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Aucune donnée (villes non renseignées)</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {topCities.map(([city, count], i) => {
                const pct = Math.round((count / maxCityCount) * 100)
                return (
                  <div key={city} className="card bg-gray-50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                      <span className="text-sm font-medium text-gray-800 truncate">{city}</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
