import { getUserContext } from '@/lib/get-context'
import { createServerClient } from '@/lib/supabase/server'

type OrderRow = { id: string; cod_amount: number; status: string; created_at: string }
type DeliveryRow = {
  fee: number | null
  order: { id: string; status: string; seller_id: string; deleted_at: string | null } | null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fromParam = searchParams.get('from')
  const toParam   = searchParams.get('to')
  const periodParam = parseInt(searchParams.get('period') ?? '30')

  const context = await getUserContext()
  if (!context) return new Response('Non autorisé', { status: 401 })
  if (context.plan === 'starter') return new Response('Plan Pro requis', { status: 403 })

  let cutoff: Date
  let cutoffEnd: Date
  let period: number
  let fileLabel: string

  if (fromParam && toParam) {
    cutoff    = new Date(fromParam)
    cutoff.setHours(0, 0, 0, 0)
    cutoffEnd = new Date(toParam)
    cutoffEnd.setHours(23, 59, 59, 999)
    period = Math.ceil((cutoffEnd.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24))
    if (period > 365) return new Response('Période maximum 365 jours', { status: 400 })
    fileLabel = `${fromParam}-${toParam}`
  } else {
    period    = Math.min(180, Math.max(1, periodParam))
    cutoff    = new Date()
    cutoff.setDate(cutoff.getDate() - period)
    cutoff.setHours(0, 0, 0, 0)
    cutoffEnd = new Date()
    cutoffEnd.setHours(23, 59, 59, 999)
    fileLabel = `${period}j-${new Date().toISOString().split('T')[0]}`
  }

  const supabase = await createServerClient()

  // Cast as unknown to prevent TypeScript from hanging on Supabase join generics
  const [{ data: ordersRaw }, { data: deliveriesRaw }] = (await Promise.all([
    supabase
      .from('orders')
      .select('id, cod_amount, status, created_at')
      .eq('seller_id', context.sellerId)
      .is('deleted_at', null)
      .gte('created_at', cutoff.toISOString())
      .lte('created_at', cutoffEnd.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('deliveries')
      .select('fee, order:orders(id, status, seller_id, deleted_at)')
      .order('created_at', { ascending: false }),
  ])) as unknown as [{ data: OrderRow[] | null }, { data: DeliveryRow[] | null }]

  const orderList = ordersRaw ?? []

  // Map delivery fees by order id for profit calculation
  const feeByOrderId: Record<string, number> = {}
  for (const d of deliveriesRaw ?? []) {
    const o = Array.isArray(d.order) ? d.order[0] : d.order
    if (o?.seller_id === context.sellerId && o?.deleted_at === null) {
      feeByOrderId[o.id] = (feeByOrderId[o.id] ?? 0) + (d.fee ?? 0)
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
    const profit = revenue - fees
    const deliveryRate = shipped.length > 0 ? Math.round((delivered.length / shipped.length) * 100) : 0
    const codPending = dayOrders
      .filter(o => ['pending', 'new', 'confirmed', 'shipped'].includes(o.status))
      .reduce((s, o) => s + o.cod_amount, 0)

    rows.push(`${dateStr},${dayOrders.length},${revenue.toFixed(2)},${profit.toFixed(2)},${deliveryRate}%,${codPending.toFixed(2)}`)
    cursor.setDate(cursor.getDate() + 1)
  }

  const BOM = '﻿'
  const header = 'Date,Commandes,CA livré,Profit net,Taux livraison,COD en attente'
  const csv = BOM + [header, ...rows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hanut-analytics-${fileLabel}.csv"`,
    },
  })
}
