export type AnalyticsSummary = {
  total_revenue: number
  total_fees: number
  total_cost: number
  order_count: number
  shipped_count: number
  delivered_count: number
  returned_count: number
  cancelled_count: number
}

export type AnalyticsOrderRow = {
  status: string
  cod_amount: number | string | null
  quantity: number | string | null
  unit_cost: number | string | null
  items?: { unit_cost: number | string | null; quantity: number | string | null }[] | null
}

export const EMPTY_ANALYTICS: AnalyticsSummary = {
  total_revenue: 0,
  total_fees: 0,
  total_cost: 0,
  order_count: 0,
  shipped_count: 0,
  delivered_count: 0,
  returned_count: 0,
  cancelled_count: 0,
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeAnalyticsSummary(value: unknown): AnalyticsSummary | null {
  if (!value || typeof value !== 'object') return null

  const summary = value as Record<string, unknown>
  return {
    total_revenue: toNumber(summary.total_revenue),
    total_fees: toNumber(summary.total_fees),
    total_cost: toNumber(summary.total_cost),
    order_count: toNumber(summary.order_count),
    shipped_count: toNumber(summary.shipped_count),
    delivered_count: toNumber(summary.delivered_count),
    returned_count: toNumber(summary.returned_count),
    cancelled_count: toNumber(summary.cancelled_count),
  }
}

export function summarizeOrders(rows: AnalyticsOrderRow[]): AnalyticsSummary {
  return rows.reduce<AnalyticsSummary>((summary, order) => {
    summary.order_count += 1

    if (order.status === 'shipped') {
      summary.shipped_count += 1
    } else if (order.status === 'delivered') {
      summary.delivered_count += 1
      summary.total_revenue += toNumber(order.cod_amount)
      summary.total_cost += order.items && order.items.length > 0
        ? order.items.reduce((s, i) => s + toNumber(i.unit_cost) * toNumber(i.quantity), 0)
        : toNumber(order.unit_cost) * toNumber(order.quantity)
    } else if (order.status === 'returned') {
      summary.returned_count += 1
    } else if (order.status === 'cancelled') {
      summary.cancelled_count += 1
    }

    return summary
  }, { ...EMPTY_ANALYTICS })
}
