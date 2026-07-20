'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Banknote, TrendingUp, TrendingDown, Minus, ShoppingBag, Truck, Clock, Download, Calendar, X as XIcon, ExternalLink } from 'lucide-react'
import { getCarrierConfig, ORDER_STATUS_CONFIG, ORDER_STATUSES } from '@/lib/constants'
import type {
  AnalyticsData,
  AnalyticsCarrierStat,
} from '@/app/(dashboard)/analytics/actions'

type Props = {
  initialData: AnalyticsData
  plan: 'starter' | 'pro' | 'business'
  loadData: (from: string, to: string) => Promise<AnalyticsData | null>
  slug?: string | null
}

type Period = 7 | 30 | 90
type ChartMode = 'orders' | 'ca'

const PERIOD_LABELS: Record<Period, string> = { 7: '7 jours', 30: '30 jours', 90: '90 jours' }

export default function AnalyticsClient({ initialData, plan, loadData, slug }: Props) {
  const [data, setData]       = useState<AnalyticsData>(initialData)
  const [loading, setLoading] = useState(false)
  const [period, setPeriod]   = useState<Period>(30)
  const [chartMode, setChartMode] = useState<ChartMode>('orders')
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef    = useRef<HTMLDivElement>(null)
  const isFirstMount = useRef(true)

  const todayStr = new Date().toISOString().split('T')[0]
  const minDate  = useMemo(() => {
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

  // Fetch new aggregated data whenever the effective period changes.
  // Skip the first render (initialData from SSR already covers default 30d).
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    if (customMode && (!customFrom || !customTo)) return

    let cancelled = false
    setLoading(true)
    loadData(cutoff.toISOString(), cutoffEnd.toISOString()).then(fresh => {
      if (cancelled) return
      if (fresh) setData(fresh)
      setLoading(false)
    })
    return () => { cancelled = true }
  // loadData is a stable server action ref — intentionally omitted from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutoff, cutoffEnd])

  // ── Derived KPI values ──────────────────────────────────────────────
  const s  = data.summary
  const ps = data.prev_summary

  const totalOrders    = s.order_count
  const deliveredCount = s.delivered_count
  const shippedCount   = s.shipped_count
  const returnedCount  = s.returned_count
  const closedCount    = shippedCount + deliveredCount + returnedCount
  const deliveryRate   = closedCount > 0 ? Math.round(deliveredCount / closedCount * 100) : 0
  const returnRate     = closedCount > 0 ? Math.round(returnedCount  / closedCount * 100) : 0
  const revenue        = s.total_revenue
  const totalFees      = s.total_fees
  const totalCost      = s.total_cost
  const profit         = revenue - totalFees - totalCost
  const hasMissingCost = s.has_missing_cost
  const codPending     = s.cod_pending

  const prevClosedCount  = ps.shipped_count + ps.delivered_count + ps.returned_count
  const prevRevenue      = ps.total_revenue
  const prevTotalOrders  = ps.order_count
  const prevDeliveryRate = prevClosedCount > 0 ? Math.round(ps.delivered_count / prevClosedCount * 100) : 0
  const prevProfit       = ps.total_revenue - ps.total_fees - ps.total_cost

  // ── Chart data ──────────────────────────────────────────────────────
  const statusCounts    = data.by_status   ?? {}
  const maxStatusCount  = Math.max(...Object.values(statusCounts), 1)

  const topProducts       = data.top_products  ?? []
  const maxProductRevenue = Math.max(...topProducts.map(p => p.revenue), 1)

  const topCustomers       = data.top_customers ?? []
  const maxCustomerRevenue = Math.max(...topCustomers.map(c => c.revenue), 1)

  const topCities    = data.top_zones ?? []
  const maxCityCount = Math.max(...topCities.map(z => z.count), 1)

  const carrierList = (data.carrier_stats ?? []).map((cs: AnalyticsCarrierStat) => ({
    key:          cs.key,
    label:        cs.key === 'self' ? 'Livraison en personne' : getCarrierConfig(cs.key).label,
    shipped:      cs.shipped,
    delivered:    cs.delivered,
    codToReverse: cs.cod_to_reverse,
    codPending:   cs.cod_pending,
    fees:         cs.fees,
    rate: cs.shipped > 0 ? Math.round((cs.delivered / cs.shipped) * 100) : 0,
  })).sort((a, b) => b.shipped - a.shipped)

  const displayedCarriers = selectedCarrier
    ? carrierList.filter(c => c.key === selectedCarrier)
    : carrierList

  const dailyData = useMemo(() => {
    return (data.daily ?? []).map(d => {
      // Use noon to avoid DST edge cases when parsing a date-only string
      const date = new Date(d.date + 'T12:00:00')
      return {
        label:     date.toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' }),
        fullLabel: date.toLocaleDateString('fr-TN', { weekday: 'long', day: '2-digit', month: 'long' }),
        orders:    d.order_count,
        revenue:   d.delivered_revenue,
      }
    })
  }, [data.daily])

  const maxDailyOrders  = Math.max(...dailyData.map(d => d.orders), 1)
  const maxDailyRevenue = Math.max(...dailyData.map(d => d.revenue), 1)

  // ── Helpers ─────────────────────────────────────────────────────────
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

  function getExportUrl(): string {
    if (customMode && customFrom && customTo) {
      return `/api/analytics/export?from=${customFrom}&to=${customTo}`
    }
    return `/api/analytics/export?period=${period}`
  }

  function getExportFilename(): string {
    if (customMode && customFrom && customTo) {
      return `hanut-analytics-${customFrom}-${customTo}.csv`
    }
    return `hanut-analytics-${period}j-${new Date().toISOString().split('T')[0]}.csv`
  }

  async function handleExport() {
    if (exporting || plan === 'starter') return
    setExporting(true)
    try {
      const res = await fetch(getExportUrl())
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = getExportFilename()
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const KPI_ITEMS = [
    { label: 'CA encaissé',    value: `${revenue.toFixed(0)} DT`,   sub: `${deliveredCount} livrée${deliveredCount !== 1 ? 's' : ''}`,  icon: Banknote,    valueClass: 'text-[#16A34A]', trend: trendDir(revenue,      prevRevenue),      trendText: trendLabel(revenue,      prevRevenue) },
    { label: 'Profit net',     value: `${profit.toFixed(0)} DT`,    sub: totalCost > 0 ? `Frais: ${totalFees.toFixed(0)} · Coût: ${totalCost.toFixed(0)} DT` : `Frais: ${totalFees.toFixed(0)} DT`, icon: TrendingUp,  valueClass: 'text-[#0B5E46]', trend: trendDir(profit,       prevProfit),       trendText: trendLabel(profit,       prevProfit) },
    { label: 'Commandes',      value: String(totalOrders),          sub: 'sur la période',                                               icon: ShoppingBag, valueClass: 'text-[#1C1917]', trend: trendDir(totalOrders,  prevTotalOrders),  trendText: trendLabel(totalOrders,  prevTotalOrders) },
    { label: 'Taux livraison', value: `${deliveryRate}%`,           sub: `Retours: ${returnRate}%`,                                      icon: Truck,       valueClass: 'text-[#1C1917]', trend: trendDir(deliveryRate, prevDeliveryRate), trendText: trendLabel(deliveryRate, prevDeliveryRate) },
    { label: 'COD en attente', value: `${codPending.toFixed(0)} DT`, sub: 'non encore livré',                                           icon: Clock,       valueClass: 'text-amber-600', trend: 'stable' as const, trendText: '' },
  ]

  return (
    <div className={`space-y-6 transition-opacity duration-200 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>

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
              {([7, 30, ...(plan !== 'starter' ? [90] : [])] as Period[]).map(p => (
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
            {plan !== 'starter' && (
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
                  <div className="absolute right-0 left-0 sm:left-auto top-full mt-2 bg-white border border-[#E7E5E4] rounded-xl shadow-lg p-4 z-20 w-auto sm:w-72">
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

      {/* Empty state : aucune commande sur la période */}
      {totalOrders === 0 && (
        customMode ? (
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-10 text-center">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-[#E7E5E4]" />
            <p className="font-medium text-[#1C1917]">Aucune commande sur cette période</p>
            <p className="text-sm text-[#78716C] mt-1">Élargissez la période ou choisissez une autre plage de dates.</p>
          </div>
        ) : (
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-6 text-center space-y-4">
            <ShoppingBag className="w-10 h-10 mx-auto text-[#16A34A] opacity-60" />
            <div>
              <p className="font-semibold text-[#0B5E46]">Vos statistiques apparaîtront ici dès vos premières commandes livrées</p>
              <p className="text-sm text-[#16A34A] mt-1">Partagez votre lien boutique pour commencer à recevoir des commandes !</p>
            </div>
            {slug ? (
              <button
                type="button"
                onClick={() => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${slug}`
                  navigator.clipboard?.writeText(url).catch(() => {})
                }}
                className="inline-flex items-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                Copier mon lien boutique
              </button>
            ) : (
              <Link
                href="/settings?tab=link"
                className="inline-flex items-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                Créer mon lien boutique →
              </Link>
            )}
          </div>
        )
      )}

      {/* Banner : coûts d'achat manquants */}
      {hasMissingCost && (
        <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 16 16"><path d="M8 1.333A6.667 6.667 0 1 0 8 14.667 6.667 6.667 0 0 0 8 1.333Zm0 3.334a.667.667 0 1 1 0 1.333.667.667 0 0 1 0-1.333Zm.667 6H7.333V7.333h1.334V10.667Z" fill="currentColor"/></svg>
          <span>
            Certains produits livrés n&apos;ont pas de coût d&apos;achat renseigné — le profit peut être surestimé.{' '}
            <Link href="/catalog" className="font-medium underline underline-offset-2">Renseigner les coûts →</Link>
          </span>
        </div>
      )}

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
                      {s.trend === 'up'   && <TrendingUp   className="w-3 h-3 shrink-0" />}
                      {s.trend === 'down' && <TrendingDown  className="w-3 h-3 shrink-0" />}
                      {s.trend === 'stable' && <Minus       className="w-3 h-3 shrink-0" />}
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
          {plan === 'starter' ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="9" width="16" height="11" rx="2" stroke="#9CA3AF" strokeWidth="1.5"/><path d="M6 9V6a4 4 0 018 0v3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <p className="text-sm text-[#78716C] text-center">Disponible sur le <a href="/settings?tab=abonnement" className="text-[#16A34A] font-medium hover:underline">plan Pro</a></p>
            </div>
          ) : topProducts.length === 0 ? (
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

      {/* Tableau par mode de livraison — Pro uniquement */}
      {plan !== 'starter' && carrierList.length > 0 && (
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E7E5E4]">
            <h2 className="font-semibold text-[#1C1917] mb-3">Par mode de livraison</h2>
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
                  {['Mode', 'Expédiées', 'Livrées', 'Taux', 'COD à reverser', 'COD en attente', 'Frais'].map((h, i) => (
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
          {plan === 'starter' ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="9" width="16" height="11" rx="2" stroke="#9CA3AF" strokeWidth="1.5"/><path d="M6 9V6a4 4 0 018 0v3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <p className="text-sm text-[#78716C] text-center">Disponible sur le <a href="/settings?tab=abonnement" className="text-[#16A34A] font-medium hover:underline">plan Pro</a></p>
            </div>
          ) : topCustomers.length === 0 ? (
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
          <h2 className="font-semibold text-[#1C1917] mb-4">Top zones</h2>
          {plan === 'starter' ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="9" width="16" height="11" rx="2" stroke="#9CA3AF" strokeWidth="1.5"/><path d="M6 9V6a4 4 0 018 0v3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <p className="text-sm text-[#78716C] text-center">Disponible sur le <a href="/settings?tab=abonnement" className="text-[#16A34A] font-medium hover:underline">plan Pro</a></p>
            </div>
          ) : topCities.length === 0 ? (
            <p className="text-sm text-[#78716C] py-4 text-center">Aucune donnée (zones non renseignées)</p>
          ) : (
            <div className="space-y-3">
              {topCities.map(({ zone: city, count }, i) => (
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
