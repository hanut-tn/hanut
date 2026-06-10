import { getUserContext } from '@/lib/get-context'
import { createServerClient } from '@/lib/supabase/server'

type OrderRow = {
  id: string
  cod_amount: number
  quantity: number
  unit_cost: number
  status: string
  created_at: string
}
type DeliveryRow = {
  fee: number | null
  order_id: string
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 24 * 60 * 60 * 1000

function parseDateOnly(value: string): Date | null {
  if (!DATE_ONLY_RE.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  if (date.toISOString().slice(0, 10) !== value) return null
  return date
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fromParam = searchParams.get('from')
  const toParam   = searchParams.get('to')
  const rawPeriod = Number.parseInt(searchParams.get('period') ?? '30', 10)

  const context = await getUserContext()
  if (!context) return new Response('Non autorisé', { status: 401 })
  if (context.plan === 'starter') return new Response('Plan Pro requis', { status: 403 })

  let cutoff: Date
  let cutoffEnd: Date
  let period: number
  let fileLabel: string

  if (fromParam || toParam) {
    if (!fromParam || !toParam) return new Response('Dates from/to requises', { status: 400 })

    const fromDate = parseDateOnly(fromParam)
    const toDate = parseDateOnly(toParam)
    if (!fromDate || !toDate) return new Response('Format de date invalide', { status: 400 })

    cutoff = fromDate
    cutoffEnd = new Date(toDate)
    cutoffEnd.setUTCHours(23, 59, 59, 999)
    period = Math.floor((cutoffEnd.getTime() - cutoff.getTime()) / DAY_MS) + 1
    if (period < 1) return new Response('Période invalide', { status: 400 })
    if (period > 365) return new Response('Période maximum 365 jours', { status: 400 })
    fileLabel = `${fromParam}-${toParam}`
  } else {
    period    = Number.isFinite(rawPeriod) ? Math.min(180, Math.max(1, rawPeriod)) : 30
    cutoff    = new Date()
    cutoff.setDate(cutoff.getDate() - period)
    cutoff.setHours(0, 0, 0, 0)
    cutoffEnd = new Date()
    cutoffEnd.setHours(23, 59, 59, 999)
    fileLabel = `${period}j-${new Date().toISOString().split('T')[0]}`
  }

  const supabase = await createServerClient()

  const { data: ordersRaw } = (await supabase
    .from('orders')
    .select('id, cod_amount, quantity, unit_cost, status, created_at')
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)
    .gte('created_at', cutoff.toISOString())
    .lte('created_at', cutoffEnd.toISOString())
    .order('created_at', { ascending: true })) as unknown as { data: OrderRow[] | null }

  const orderList = ordersRaw ?? []

  // Map delivery fees by order id for profit calculation — bornées par les commandes de la période
  const feeByOrderId: Record<string, number> = {}
  if (orderList.length > 0) {
    const { data: deliveriesRaw } = (await supabase
      .from('deliveries')
      .select('fee, order_id')
      .in('order_id', orderList.map(o => o.id))) as unknown as { data: DeliveryRow[] | null }

    for (const d of deliveriesRaw ?? []) {
      feeByOrderId[d.order_id] = (feeByOrderId[d.order_id] ?? 0) + (d.fee ?? 0)
    }
  }

  const rows: string[] = []
  const cursor = new Date(cutoff)
  while (cursor <= cutoffEnd) {
    const dateStr = cursor.toISOString().split('T')[0]

    const dayOrders = orderList.filter(o => o.created_at.startsWith(dateStr))
    const delivered = dayOrders.filter(o => o.status === 'delivered')
    const shipped = dayOrders.filter(o => ['shipped', 'delivered', 'returned'].includes(o.status))
    const revenue = delivered.reduce((s, o) => s + o.cod_amount, 0)
    const fees = delivered.reduce((s, o) => s + (feeByOrderId[o.id] ?? 0), 0)
    const costs = delivered.reduce((s, o) => s + (o.unit_cost ?? 0) * (o.quantity ?? 1), 0)
    const profit = revenue - fees - costs
    const deliveryRate = shipped.length > 0 ? Math.round((delivered.length / shipped.length) * 100) : 0
    const codPending = dayOrders
      .filter(o => ['pending', 'new', 'confirmed', 'shipped'].includes(o.status))
      .reduce((s, o) => s + o.cod_amount, 0)

    rows.push(`${dateStr},${dayOrders.length},${revenue.toFixed(2)},${costs.toFixed(2)},${fees.toFixed(2)},${profit.toFixed(2)},${deliveryRate}%,${codPending.toFixed(2)}`)
    cursor.setDate(cursor.getDate() + 1)
  }

  const BOM = '﻿'
  const header = 'Date,Commandes,CA livré,Coût produits,Frais livraison,Profit net,Taux livraison,COD en attente'
  const csv = BOM + [header, ...rows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hanut-analytics-${fileLabel}.csv"`,
    },
  })
}
