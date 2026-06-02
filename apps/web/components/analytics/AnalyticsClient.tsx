'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type Product = { id: string; name: string }
type Customer = { id: string; name: string; city?: string }

type Order = {
  id: string
  cod_amount: number
  status: string
  created_at: string
  product?: Product | Product[] | null
  customer?: Customer | Customer[] | null
}

type DeliveryOrder = { status: string; cod_amount: number; created_at: string }

type Delivery = {
  carrier: string
  fee?: number | null
  cod_collected: boolean
  cod_reversed: boolean
  order?: DeliveryOrder | DeliveryOrder[] | null
}

type Props = {
  orders: Order[]
  deliveries: Delivery[]
}

type Period = 7 | 30 | 90
type ChartMode = 'orders' | 'ca'

const PERIOD_LABELS: Record<Period, string> = { 7: '7 jours', 30: '30 jours', 90: '90 jours' }

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-orange-300',
  new:       'bg-blue-400',
  confirmed: 'bg-yellow-400',
  shipped:   'bg-purple-400',
  delivered: 'bg-green-400',
  returned:  'bg-red-400',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente', new: 'Nouvelles', confirmed: 'Confirmées',
  shipped: 'Expédiées', delivered: 'Livrées', returned: 'Retournées',
}

const CARRIER_LABELS: Record<string, string> = {
  intigo: 'IntiGo',
  navex: 'Navex',
  adex: 'Adex',
  aramex: 'Aramex',
  bestdelivery: 'Best Delivery',
}

function getProduct(o: Order): Product | null {
  const p = Array.isArray(o.product) ? o.product[0] : o.product
  return p ?? null
}

function getCustomer(o: Order): Customer | null {
  const c = Array.isArray(o.customer) ? o.customer[0] : o.customer
  return c ?? null
}

function getDeliveryOrder(d: Delivery): DeliveryOrder | null {
  const o = Array.isArray(d.order) ? d.order[0] : d.order
  return o ?? null
}

export default function AnalyticsClient({ orders, deliveries }: Props) {
  const [period, setPeriod] = useState<Period>(30)
  const [chartMode, setChartMode] = useState<ChartMode>('orders')

  const cutoff = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - period)
    d.setHours(0, 0, 0, 0)
    return d
  }, [period])

  const filtered = useMemo(
    () => orders.filter(o => new Date(o.created_at) >= cutoff),
    [orders, cutoff]
  )

  const filteredDeliveries = useMemo(
    () => deliveries.filter(d => {
      const o = getDeliveryOrder(d)
      return o && new Date(o.created_at) >= cutoff
    }),
    [deliveries, cutoff]
  )

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const delivered    = filtered.filter(o => o.status === 'delivered')
  const revenue      = delivered.reduce((s, o) => s + o.cod_amount, 0)
  const totalOrders  = filtered.length
  const closedOrders = filtered.filter(o => ['shipped', 'delivered', 'returned'].includes(o.status))
  const deliveryRate = closedOrders.length > 0
    ? Math.round(delivered.length / closedOrders.length * 100) : 0
  const returnRate   = closedOrders.length > 0
    ? Math.round(filtered.filter(o => o.status === 'returned').length / closedOrders.length * 100) : 0
  const codPending   = filtered
    .filter(o => ['pending', 'new', 'confirmed', 'shipped'].includes(o.status))
    .reduce((s, o) => s + o.cod_amount, 0)

  const totalFees = filteredDeliveries.reduce((s, d) => {
    const o = getDeliveryOrder(d)
    return o?.status === 'delivered' ? s + (d.fee ?? 0) : s
  }, 0)
  const profit = revenue - totalFees

  // ── Status distribution ──────────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {}
  for (const o of filtered) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1
  const maxStatusCount = Math.max(...Object.values(statusCounts), 1)

  // ── Top products (by delivered revenue) ──────────────────────────────────────
  const productMap: Record<string, { name: string; revenue: number; count: number }> = {}
  for (const o of filtered) {
    const p = getProduct(o)
    if (p && o.status === 'delivered') {
      if (!productMap[p.id]) productMap[p.id] = { name: p.name, revenue: 0, count: 0 }
      productMap[p.id].revenue += o.cod_amount
      productMap[p.id].count  += 1
    }
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const maxProductRevenue = Math.max(...topProducts.map(p => p.revenue), 1)

  // ── Top customers (by delivered revenue) ─────────────────────────────────────
  const customerMap: Record<string, { name: string; revenue: number; count: number }> = {}
  for (const o of filtered) {
    const c = getCustomer(o)
    if (c?.id && o.status === 'delivered') {
      if (!customerMap[c.id]) customerMap[c.id] = { name: c.name, revenue: 0, count: 0 }
      customerMap[c.id].revenue += o.cod_amount
      customerMap[c.id].count  += 1
    }
  }
  const topCustomers = Object.values(customerMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const maxCustomerRevenue = Math.max(...topCustomers.map(c => c.revenue), 1)

  // ── Top cities ────────────────────────────────────────────────────────────────
  const cityMap: Record<string, number> = {}
  for (const o of filtered) {
    const c = getCustomer(o)
    if (c?.city) cityMap[c.city] = (cityMap[c.city] ?? 0) + 1
  }
  const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxCityCount = Math.max(...topCities.map(c => c[1]), 1)

  // ── Carrier breakdown ─────────────────────────────────────────────────────────
  type CarrierStats = {
    shipped: number; delivered: number
    codToReverse: number; codPending: number; fees: number
  }
  const carrierMap: Record<string, CarrierStats> = {}
  for (const d of filteredDeliveries) {
    const o = getDeliveryOrder(d)
    if (!o) continue
    if (!carrierMap[d.carrier]) carrierMap[d.carrier] = { shipped: 0, delivered: 0, codToReverse: 0, codPending: 0, fees: 0 }
    const c = carrierMap[d.carrier]
    c.shipped += 1
    if (o.status === 'delivered') c.delivered += 1
    if (d.cod_collected && !d.cod_reversed) c.codToReverse += o.cod_amount
    if (!d.cod_collected && ['shipped', 'delivered'].includes(o.status)) c.codPending += o.cod_amount
    c.fees += d.fee ?? 0
  }
  const carrierList = Object.entries(carrierMap).map(([key, stats]) => ({
    key,
    label: CARRIER_LABELS[key] ?? key,
    ...stats,
    rate: stats.shipped > 0 ? Math.round((stats.delivered / stats.shipped) * 100) : 0,
  })).sort((a, b) => b.shipped - a.shipped)

  // ── Daily chart ────────────────────────────────────────────────────────────────
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

  const maxDailyOrders  = Math.max(...dailyData.map(d => d.orders), 1)
  const maxDailyRevenue = Math.max(...dailyData.map(d => d.revenue), 1)

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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

      {/* KPI cards — 5 en grille */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {[
          { label: 'CA encaissé',    value: `${revenue.toFixed(0)} DT`,  sub: `${delivered.length} livrée${delivered.length !== 1 ? 's' : ''}`, icon: '💰', bg: 'bg-green-50',   text: 'text-green-600' },
          { label: 'Profit net',     value: `${profit.toFixed(0)} DT`,   sub: `Frais: ${totalFees.toFixed(0)} DT`,                               icon: '📈', bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { label: 'Commandes',      value: String(totalOrders),          sub: 'sur la période',                                                   icon: '📦', bg: 'bg-blue-50',    text: 'text-blue-600' },
          { label: 'Taux livraison', value: `${deliveryRate}%`,           sub: `Retours: ${returnRate}%`,                                          icon: '🚚', bg: 'bg-purple-50',  text: 'text-purple-600' },
          { label: 'COD en attente', value: `${codPending.toFixed(0)} DT`, sub: 'non encore livré',                                               icon: '⏳', bg: 'bg-orange-50',  text: 'text-orange-500' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 truncate">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
              <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-base ${s.bg} ${s.text}`}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart commandes / CA */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="font-semibold text-gray-900">Évolution sur la période</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {(['orders', 'ca'] as ChartMode[]).map(m => (
              <button
                key={m}
                onClick={() => setChartMode(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  chartMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'orders' ? 'Commandes' : 'CA livré'}
              </button>
            ))}
          </div>
        </div>

        {totalOrders === 0 ? (
          <div className="h-28 flex items-center justify-center text-gray-400 text-sm">
            Aucune commande sur cette période
          </div>
        ) : (
          <>
            <div className="flex items-end gap-0.5 h-32">
              {dailyData.map((d, i) => {
                const val = chartMode === 'orders' ? d.orders : d.revenue
                const max = chartMode === 'orders' ? maxDailyOrders : maxDailyRevenue
                const pct = Math.max(val > 0 ? 4 : 0, (val / max) * 100)
                return (
                  <div key={i} className="flex-1 relative group" style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div
                      className={`w-full rounded-t-sm transition-colors cursor-default ${
                        chartMode === 'orders' ? 'bg-brand-200 hover:bg-brand-400' : 'bg-green-200 hover:bg-green-400'
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-gray-900 text-white text-[11px] rounded-md px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {d.label}: {chartMode === 'orders' ? `${d.orders} cmd` : `${d.revenue.toFixed(0)} DT`}
                    </div>
                  </div>
                )
              })}
            </div>
            {period <= 30 && (
              <div className="flex mt-1">
                {dailyData.map((d, i) => {
                  const show = period <= 7 || i % Math.ceil(period / 7) === 0
                  return (
                    <div key={i} className="flex-1 text-center">
                      {show && <span className="text-[9px] text-gray-400">{d.label}</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Statuts + Top produits */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Répartition des statuts</h2>
          {totalOrders === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {(['pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned'] as const)
                .filter(s => statusCounts[s])
                .map(s => {
                  const count = statusCounts[s] ?? 0
                  return (
                    <div key={s}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">{STATUS_LABEL[s]}</span>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${STATUS_COLOR[s]}`}
                          style={{ width: `${Math.round((count / maxStatusCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Top produits</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 truncate max-w-[60%]">{p.name}</span>
                    <span className="text-sm font-medium text-gray-900 ml-2 shrink-0">
                      {p.revenue.toFixed(0)} DT
                      <span className="text-xs text-gray-400 font-normal ml-1">({p.count})</span>
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-400 transition-all"
                      style={{ width: `${Math.round((p.revenue / maxProductRevenue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tableau par livreur */}
      {carrierList.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Par livreur</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Livreur', 'Expédiées', 'Livrées', 'Taux', 'COD à reverser', 'COD en attente', 'Frais'].map((h, i) => (
                    <th key={i} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {carrierList.map(c => (
                  <tr key={c.key} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-gray-900">{c.label}</td>
                    <td className="px-5 py-4 text-gray-600">{c.shipped}</td>
                    <td className="px-5 py-4 text-gray-600">{c.delivered}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.rate >= 80 ? 'bg-green-100 text-green-700'
                        : c.rate >= 60 ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                      }`}>
                        {c.rate}%
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {c.codToReverse > 0
                        ? <span className="font-semibold text-orange-600">{c.codToReverse.toFixed(0)} DT</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      {c.codPending > 0
                        ? <span className="text-gray-700">{c.codPending.toFixed(0)} DT</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {c.fees > 0 ? `${c.fees.toFixed(0)} DT` : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top clients + Top villes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Top clients</h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-6 h-6 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {c.name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()}
                    </div>
                    <Link
                      href={`/customers`}
                      className="text-sm text-gray-700 truncate flex-1 hover:text-brand-600 transition-colors"
                    >
                      {c.name}
                    </Link>
                    <span className="text-sm font-semibold text-gray-900 shrink-0">
                      {c.revenue.toFixed(0)} DT
                      <span className="text-xs text-gray-400 font-normal ml-1">({c.count})</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-9">
                    <div
                      className="h-full rounded-full bg-brand-300 transition-all"
                      style={{ width: `${Math.round((c.revenue / maxCustomerRevenue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Top villes</h2>
          {topCities.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Aucune donnée (villes non renseignées)</p>
          ) : (
            <div className="space-y-3">
              {topCities.map(([city, count], i) => (
                <div key={city}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                      {city}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{count} cmd</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-300 transition-all"
                      style={{ width: `${Math.round((count / maxCityCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
