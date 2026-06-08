'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Banknote, TrendingUp, TrendingDown, Minus, ShoppingBag, Truck, Clock, Download, Calendar, X as XIcon, ExternalLink } from 'lucide-react'
import { getCarrierConfig, ORDER_STATUS_CONFIG, ORDER_STATUSES } from '@/lib/constants'

type Product = { id: string; name: string }
type Customer = { id: string; name: string; city?: string | null }

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
  plan: 'starter' | 'pro' | 'business'
}

type Period = 7 | 30 | 90
type ChartMode = 'orders' | 'ca'

const PERIOD_LABELS: Record<Period, string> = { 7: '7 jours', 30: '30 jours', 90: '90 jours' }

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

export default function AnalyticsClient({ orders, deliveries, plan }: Props) {
  const [period, setPeriod] = useState<Period>(30)
  const [chartMode, setChartMode] = useState<ChartMode>('orders')
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const todayStr = new Date().toISOString().split('T')[0]
  const minDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 180)
    return d.toISOString().split('T')[0]
  }, [])

  useEffect(() => {
    if (!showPicker) return
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showPicker])

  const cutoff = useMemo(() => {
    if (customMode && customFrom) {
      const d = new Date(customFrom)
      d.setHours(0, 0, 0, 0)
      return d
    }
    const d = new Date()
    d.setDate(d.getDate() - period)
    d.setHours(0, 0, 0, 0)
    return d
  }, [period, customMode, customFrom])

  const cutoffEnd = useMemo(() => {
    if (customMode && customTo) {
      const d = new Date(customTo)
      d.setHours(23, 59, 59, 999)
      return d
    }
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d
  }, [customMode, customTo])

  const prevCutoff = useMemo(() => {
    if (customMode && customFrom && customTo) {
      const from = new Date(customFrom)
      const to = new Date(customTo)
      from.setHours(0, 0, 0, 0)
      to.setHours(0, 0, 0, 0)
      const oneDay = 24 * 60 * 60 * 1000
      const duration = to.getTime() - from.getTime() + oneDay
      return new Date(from.getTime() - duration)
    }
    const d = new Date()
    d.setDate(d.getDate() - period * 2)
    d.setHours(0, 0, 0, 0)
    return d
  }, [period, customMode, customFrom, customTo])

  const filtered = useMemo(
    () => orders.filter(o => {
      const d = new Date(o.created_at)
      return d >= cutoff && d <= cutoffEnd
    }),
    [orders, cutoff, cutoffEnd]
  )

  const prevFiltered = useMemo(
    () => orders.filter(o => {
      const d = new Date(o.created_at)
      return d >= prevCutoff && d < cutoff
    }),
    [orders, prevCutoff, cutoff]
  )

  const filteredDeliveries = useMemo(
    () => deliveries.filter(d => {
      const o = getDeliveryOrder(d)
      if (!o) return false
      const date = new Date(o.created_at)
      return date >= cutoff && date <= cutoffEnd
    }),
    [deliveries, cutoff, cutoffEnd]
  )

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

  // Previous period metrics
  const prevDelivered    = prevFiltered.filter(o => o.status === 'delivered')
  const prevRevenue      = prevDelivered.reduce((s, o) => s + o.cod_amount, 0)
  const prevTotalOrders  = prevFiltered.length
  const prevClosedOrders = prevFiltered.filter(o => ['shipped', 'delivered', 'returned'].includes(o.status))
  const prevDeliveryRate = prevClosedOrders.length > 0
    ? Math.round(prevDelivered.length / prevClosedOrders.length * 100) : 0
  const prevProfit = prevRevenue // fees not included in prev period (simplified)

  function trendDir(current: number, prev: number): 'up' | 'down' | 'stable' {
    if (prev === 0) return current > 0 ? 'up' : 'stable'
    const pct = ((current - prev) / prev) * 100
    if (Math.abs(pct) < 2) return 'stable'
    return pct > 0 ? 'up' : 'down'
  }
  function trendLabel(current: number, prev: number): string {
    if (prev === 0) return ''
    const pct = Math.round(((current - prev) / prev) * 100)
    if (Math.abs(pct) < 2) return 'stable'
    return `${pct > 0 ? '+' : ''}${pct}%`
  }

  async function handleExport() {
    if (exporting || plan === 'starter') return
    setExporting(true)
    try {
      const res = await fetch(`/api/analytics/export?period=${period}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const today = new Date().toISOString().split('T')[0]
      a.download = `hanut-analytics-${period}j-${today}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const statusCounts: Record<string, number> = {}
  for (const o of filtered) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1
  const maxStatusCount = Math.max(...Object.values(statusCounts), 1)

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

  const customerMap: Record<string, { id: string; name: string; revenue: number; count: number }> = {}
  for (const o of filtered) {
    const c = getCustomer(o)
    if (c?.id && o.status === 'delivered') {
      if (!customerMap[c.id]) customerMap[c.id] = { id: c.id, name: c.name, revenue: 0, count: 0 }
      customerMap[c.id].revenue += o.cod_amount
      customerMap[c.id].count  += 1
    }
  }
  const topCustomers = Object.values(customerMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const maxCustomerRevenue = Math.max(...topCustomers.map(c => c.revenue), 1)

  const cityMap: Record<string, number> = {}
  for (const o of filtered) {
    const c = getCustomer(o)
    if (c?.city) cityMap[c.city] = (cityMap[c.city] ?? 0) + 1
  }
  const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxCityCount = Math.max(...topCities.map(c => c[1]), 1)

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
    label: getCarrierConfig(key).label,
    ...stats,
    rate: stats.shipped > 0 ? Math.round((stats.delivered / stats.shipped) * 100) : 0,
  })).sort((a, b) => b.shipped - a.shipped)

  const displayedCarriers = selectedCarrier
    ? carrierList.filter(c => c.key === selectedCarrier)
    : carrierList

  const dailyData = useMemo(() => {
    const days: { label: string; fullLabel: string; orders: number; revenue: number }[] = []
    const start = new Date(cutoff)
    start.setHours(0, 0, 0, 0)
    const end = new Date(cutoffEnd)
    const current = new Date(start)
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      const dayOrders = filtered.filter(o => o.created_at.startsWith(dateStr))
      days.push({
        label: current.toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' }),
        fullLabel: current.toLocaleDateString('fr-TN', { weekday: 'long', day: '2-digit', month: 'long' }),
        orders: dayOrders.length,
        revenue: dayOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.cod_amount, 0),
      })
      current.setDate(current.getDate() + 1)
    }
    return days
  }, [filtered, cutoff, cutoffEnd])

  const maxDailyOrders  = Math.max(...dailyData.map(d => d.orders), 1)
  const maxDailyRevenue = Math.max(...dailyData.map(d => d.revenue), 1)

  const KPI_ITEMS = [
    { label: 'CA encaissé',    value: `${revenue.toFixed(0)} DT`,    sub: `${delivered.length} livrée${delivered.length !== 1 ? 's' : ''}`, icon: Banknote,    valueClass: 'text-[#16A34A]', trend: trendDir(revenue, prevRevenue),      trendText: trendLabel(revenue, prevRevenue) },
    { label: 'Profit net',     value: `${profit.toFixed(0)} DT`,     sub: `Frais: ${totalFees.toFixed(0)} DT`,                              icon: TrendingUp,  valueClass: 'text-[#0B5E46]', trend: trendDir(profit, prevProfit),        trendText: trendLabel(profit, prevProfit) },
    { label: 'Commandes',      value: String(totalOrders),            sub: 'sur la période',                                                 icon: ShoppingBag, valueClass: 'text-[#1C1917]', trend: trendDir(totalOrders, prevTotalOrders), trendText: trendLabel(totalOrders, prevTotalOrders) },
    { label: 'Taux livraison', value: `${deliveryRate}%`,             sub: `Retours: ${returnRate}%`,                                        icon: Truck,       valueClass: 'text-[#1C1917]', trend: trendDir(deliveryRate, prevDeliveryRate), trendText: trendLabel(deliveryRate, prevDeliveryRate) },
    { label: 'COD en attente', value: `${codPending.toFixed(0)} DT`,  sub: 'non encore livré',                                              icon: Clock,       valueClass: 'text-amber-600', trend: 'stable' as const, trendText: '' },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1C1917] sm:text-2xl">Analytiques</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            {customMode && customFrom && customTo
              ? `Du ${new Date(customFrom).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })} au ${new Date(customTo).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })}`
              : `Basé sur les ${period} derniers jours`}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 gap-2 overflow-x-auto scrollbar-none">
              {([7, 30, 90] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setCustomMode(false) }}
                  className={`min-h-[44px] touch-manipulation whitespace-nowrap px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    !customMode && period === p
                      ? 'bg-[#0B5E46] text-white'
                      : 'border border-[#E7E5E4] text-[#78716C] hover:bg-[#F5F5F4]'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
            {plan === 'business' && (
              <div className="relative shrink-0" ref={pickerRef}>
                <button
                  onClick={() => setShowPicker(prev => !prev)}
                  className={`min-h-[44px] touch-manipulation flex items-center gap-2 border rounded-lg px-3 py-1 text-sm transition-colors ${
                    customMode
                      ? 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]'
                      : 'border-[#E7E5E4] text-[#78716C] hover:bg-[#F5F5F4]'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {customMode && customFrom && customTo
                      ? `${new Date(customFrom).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })} — ${new Date(customTo).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })}`
                      : 'Personnalisé'}
                  </span>
                </button>

                {showPicker && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-[#E7E5E4] rounded-xl shadow-lg p-4 z-20 w-72">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-[#1C1917]">Période personnalisée</h3>
                      <button onClick={() => setShowPicker(false)} className="text-[#78716C] hover:text-[#1C1917] transition-colors">
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-[#78716C] mb-1">Du :</label>
                        <input
                          type="date"
                          value={customFrom}
                          onChange={e => setCustomFrom(e.target.value)}
                          min={minDate}
                          max={customTo || todayStr}
                          className="w-full border border-[#E7E5E4] rounded-lg px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#78716C] mb-1">Au :</label>
                        <input
                          type="date"
                          value={customTo}
                          onChange={e => setCustomTo(e.target.value)}
                          min={customFrom || minDate}
                          max={todayStr}
                          className="w-full border border-[#E7E5E4] rounded-lg px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => { setCustomMode(false); setShowPicker(false) }}
                        className="btn-secondary flex-1 text-sm"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => { setCustomMode(true); setShowPicker(false) }}
                        disabled={!customFrom || !customTo || customFrom > customTo}
                        className="btn-primary flex-1 text-sm disabled:opacity-40"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {plan === 'starter' ? (
            <div className="relative group">
              <button
                disabled
                className="flex w-full items-center justify-center gap-2 border border-[#E7E5E4] rounded-lg px-4 py-2 text-sm text-[#A8A29E] cursor-not-allowed opacity-60 sm:w-auto"
              >
                <Download className="w-4 h-4" />
                Exporter
              </button>
              <div className="absolute bottom-full right-0 mb-2 bg-[#1C1917] text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                Disponible en plan Pro
                <div className="absolute top-full right-4 border-4 border-transparent border-t-[#1C1917]" />
              </div>
            </div>
          ) : (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex w-full items-center justify-center gap-2 border border-[#E7E5E4] rounded-lg px-4 py-2 text-sm text-[#78716C] hover:bg-[#F5F5F4] transition-colors disabled:opacity-50 sm:w-auto"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Export...' : 'Exporter'}
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {KPI_ITEMS.map((s, idx) => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-3 sm:p-5 ${idx === 4 ? 'col-span-2 lg:col-span-1' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#78716C] truncate sm:text-sm">{s.label}</p>
                  <p className={`text-xl font-bold mt-1 sm:text-2xl ${s.valueClass}`}>{s.value}</p>
                  <p className="text-xs text-[#78716C] mt-0.5">{s.sub}</p>
                  {s.trendText && (
                    <div className={`flex items-center gap-0.5 mt-1.5 text-xs font-medium ${
                      s.trend === 'up' ? 'text-green-600' : s.trend === 'down' ? 'text-red-600' : 'text-[#78716C]'
                    }`}>
                      {s.trend === 'up' && <TrendingUp className="w-3 h-3 shrink-0" />}
                      {s.trend === 'down' && <TrendingDown className="w-3 h-3 shrink-0" />}
                      {s.trend === 'stable' && <Minus className="w-3 h-3 shrink-0" />}
                      <span>{s.trendText}</span>
                      <span className="font-normal text-[#A8A29E] ml-0.5">vs préc.</span>
                    </div>
                  )}
                </div>
                <Icon className="w-5 h-5 text-[#78716C] shrink-0 mt-0.5" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Chart commandes / CA */}
      <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="font-semibold text-[#1C1917]">Évolution sur la période</h2>
          <div className="flex gap-1 rounded-lg p-0.5 bg-gray-100">
            {(['orders', 'ca'] as ChartMode[]).map(m => (
              <button
                key={m}
                onClick={() => setChartMode(m)}
                className={`min-h-[44px] touch-manipulation px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  chartMode === m
                    ? 'bg-[#0B5E46] text-white'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                {m === 'orders' ? 'Commandes' : 'CA livré'}
              </button>
            ))}
          </div>
        </div>

        {totalOrders === 0 ? (
          <div className="h-28 flex items-center justify-center text-[#78716C] text-sm">
            Aucune donnée sur cette période
          </div>
        ) : (
          <>
            <div className="flex items-end gap-0.5 h-40 sm:h-48">
              {dailyData.map((d, i) => {
                const val = chartMode === 'orders' ? d.orders : d.revenue
                const max = chartMode === 'orders' ? maxDailyOrders : maxDailyRevenue
                const pct = Math.max(val > 0 ? 4 : 0, (val / max) * 100)
                const tooltipPosition =
                  i < 2
                    ? 'left-0 translate-x-0'
                    : i > dailyData.length - 3
                      ? 'right-0 translate-x-0'
                      : 'left-1/2 -translate-x-1/2'
                return (
                  <div key={i} className="flex-1 relative group" style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div
                      className={`w-full rounded-t-sm transition-colors cursor-default ${
                        chartMode === 'orders' ? 'bg-green-200 hover:bg-green-400' : 'bg-[#BBF7D0] hover:bg-[#16A34A]'
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                    <div className={`absolute bottom-full ${tooltipPosition} mb-2 max-w-[12rem] bg-[#1C1917] text-white text-xs rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10 whitespace-nowrap`}>
                      <p className="font-semibold capitalize">{d.fullLabel}</p>
                      <p className="text-[#16A34A] mt-0.5">CA : {d.revenue.toFixed(0)} DT</p>
                      <p className="text-white/70">Commandes : {d.orders}</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1C1917]" />
                    </div>
                  </div>
                )
              })}
            </div>
            {dailyData.length <= 30 && (
              <div className="flex mt-1">
                {dailyData.map((d, i) => {
                  const show = dailyData.length <= 7 || i % Math.ceil(dailyData.length / 7) === 0
                  return (
                    <div key={i} className="flex-1 text-center">
                      {show && <span className="text-[10px] text-[#78716C]">{d.label}</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Statuts + Top produits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-[#1C1917] mb-4">Répartition des statuts</h2>
          {totalOrders === 0 ? (
            <p className="text-sm text-[#78716C] py-4 text-center">Aucune donnée sur cette période</p>
          ) : (
            <div className="space-y-3">
              {ORDER_STATUSES
                .filter(s => statusCounts[s])
                .map(s => {
                  const count = statusCounts[s] ?? 0
                  return (
                    <div key={s}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-[#78716C]">{ORDER_STATUS_CONFIG[s].label}</span>
                        <span className="text-sm font-medium text-[#1C1917]">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${ORDER_STATUS_CONFIG[s].dot}`}
                          style={{ width: `${Math.round((count / maxStatusCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-[#1C1917] mb-4">Top produits</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-[#78716C] py-4 text-center">Aucune donnée sur cette période</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[#78716C] truncate max-w-[60%]">{p.name}</span>
                    <span className="text-sm font-medium text-[#1C1917] ml-2 shrink-0">
                      {p.revenue.toFixed(0)} DT
                      <span className="text-xs text-[#78716C] font-normal ml-1">({p.count})</span>
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#16A34A] transition-all"
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
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E7E5E4]">
            <h2 className="font-semibold text-[#1C1917] mb-3">Par livreur</h2>
            {carrierList.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCarrier(null)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    !selectedCarrier ? 'bg-[#0B5E46] text-white' : 'border border-[#E7E5E4] text-[#78716C] hover:bg-[#F5F5F4]'
                  }`}
                >
                  Tous
                </button>
                {carrierList.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setSelectedCarrier(selectedCarrier === c.key ? null : c.key)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      selectedCarrier === c.key ? 'bg-[#0B5E46] text-white' : 'border border-[#E7E5E4] text-[#78716C] hover:bg-[#F5F5F4]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
                <tr>
                  {['Livreur', 'Expédiées', 'Livrées', 'Taux', 'COD à reverser', 'COD en attente', 'Frais'].map((h, i) => (
                    <th key={i} className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4]">
                {displayedCarriers.map(c => (
                  <tr key={c.key} className="hover:bg-[#FAFAF9] transition-colors">
                    <td className="px-5 py-4 font-semibold text-[#1C1917]">{c.label}</td>
                    <td className="px-5 py-4 text-[#78716C]">{c.shipped}</td>
                    <td className="px-5 py-4 text-[#78716C]">{c.delivered}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.rate >= 80 ? 'bg-green-100 text-green-700'
                        : c.rate >= 60 ? 'bg-amber-100 text-amber-700'
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
                        ? <span className="text-[#78716C]">{c.codPending.toFixed(0)} DT</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 text-[#78716C]">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-[#1C1917] mb-4">Top clients</h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-[#78716C] py-4 text-center">Aucune donnée sur cette période</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-6 h-6 bg-[#F0FDF4] text-[#166534] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {c.name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()}
                    </div>
                    <Link
                      href={`/customers/${c.id}`}
                      className="group/link text-sm text-[#78716C] truncate flex-1 hover:text-[#16A34A] transition-colors inline-flex items-center gap-1"
                    >
                      {c.name}
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </Link>
                    <span className="text-sm font-semibold text-[#1C1917] shrink-0">
                      {c.revenue.toFixed(0)} DT
                      <span className="text-xs text-[#78716C] font-normal ml-1">({c.count})</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-9">
                    <div
                      className="h-full rounded-full bg-[#86EFAC] transition-all"
                      style={{ width: `${Math.round((c.revenue / maxCustomerRevenue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-[#1C1917] mb-4">Top villes</h2>
          {topCities.length === 0 ? (
            <p className="text-sm text-[#78716C] py-4 text-center">Aucune donnée (villes non renseignées)</p>
          ) : (
            <div className="space-y-3">
              {topCities.map(([city, count], i) => (
                <div key={city}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[#78716C] flex items-center gap-2">
                      <span className="text-xs font-bold text-[#78716C]">#{i + 1}</span>
                      {city}
                    </span>
                    <span className="text-sm font-medium text-[#1C1917]">{count} cmd</span>
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
