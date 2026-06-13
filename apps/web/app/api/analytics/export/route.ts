import { getUserContext } from '@/lib/get-context'
import { createServerClient } from '@/lib/supabase/server'
import { requireActiveResponse } from '@/lib/assert-active'

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 24 * 60 * 60 * 1000

function parseDateOnly(value: string): Date | null {
  if (!DATE_ONLY_RE.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  if (date.toISOString().slice(0, 10) !== value) return null
  return date
}

type ExportRow = {
  day: string
  order_count: number
  revenue: number
  costs: number
  fees: number
  profit: number
  delivery_rate: number
  cod_pending: number
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fromParam = searchParams.get('from')
  const toParam   = searchParams.get('to')
  const rawPeriod = Number.parseInt(searchParams.get('period') ?? '30', 10)

  const context = await getUserContext()
  if (!context) return new Response('Non autorisé', { status: 401 })
  const activeCheck = requireActiveResponse(context)
  if (activeCheck) return activeCheck
  if (context.plan === 'starter') return new Response('Plan Pro requis', { status: 403 })

  let cutoff: Date
  let cutoffEnd: Date
  let fileLabel: string

  if (fromParam || toParam) {
    if (!fromParam || !toParam) return new Response('Dates from/to requises', { status: 400 })

    const fromDate = parseDateOnly(fromParam)
    const toDate = parseDateOnly(toParam)
    if (!fromDate || !toDate) return new Response('Format de date invalide', { status: 400 })

    cutoff = fromDate
    cutoffEnd = new Date(toDate)
    cutoffEnd.setUTCHours(23, 59, 59, 999)
    const period = Math.floor((cutoffEnd.getTime() - cutoff.getTime()) / DAY_MS) + 1
    if (period < 1) return new Response('Période invalide', { status: 400 })
    if (period > 365) return new Response('Période maximum 365 jours', { status: 400 })
    fileLabel = `${fromParam}-${toParam}`
  } else {
    const period = Number.isFinite(rawPeriod) ? Math.min(180, Math.max(1, rawPeriod)) : 30
    const now = new Date()
    cutoffEnd = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999
    ))
    cutoff = new Date(cutoffEnd)
    cutoff.setUTCDate(cutoff.getUTCDate() - (period - 1))
    cutoff.setUTCHours(0, 0, 0, 0)
    fileLabel = `${period}j-${new Date().toISOString().split('T')[0]}`
  }

  const supabase = await createServerClient()

  const { data: dailyStats, error } = await supabase.rpc('get_analytics_export', {
    p_seller_id: context.sellerId,
    p_start: cutoff.toISOString(),
    p_end: cutoffEnd.toISOString(),
  })

  if (error) return new Response('Erreur lors de l\'export.', { status: 500 })

  // Map jour → données agrégées pour lookup O(1) dans la boucle
  const statsMap = new Map<string, ExportRow>()
  for (const row of (dailyStats as ExportRow[] | null) ?? []) {
    statsMap.set(String(row.day), row)
  }

  const rows: string[] = []
  const cursor = new Date(cutoff)
  while (cursor <= cutoffEnd) {
    const dateStr = cursor.toISOString().split('T')[0]
    const row = statsMap.get(dateStr)

    const orderCount    = row?.order_count    ?? 0
    const revenue       = Number(row?.revenue      ?? 0)
    const costs         = Number(row?.costs        ?? 0)
    const fees          = Number(row?.fees         ?? 0)
    const profit        = Number(row?.profit       ?? 0)
    const deliveryRate  = row?.delivery_rate  ?? 0
    const codPending    = Number(row?.cod_pending   ?? 0)

    rows.push(
      `${dateStr},${orderCount},${revenue.toFixed(2)},${costs.toFixed(2)},${fees.toFixed(2)},${profit.toFixed(2)},${deliveryRate}%,${codPending.toFixed(2)}`
    )
    cursor.setUTCDate(cursor.getUTCDate() + 1)
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
