import { describe, expect, it } from 'vitest'
import {
  normalizeAnalyticsSummary,
  summarizeOrders,
} from '@/lib/dashboard-analytics'

describe('dashboard analytics helpers', () => {
  it('summarizes revenue, cost and order statuses', () => {
    const summary = summarizeOrders([
      { status: 'delivered', cod_amount: 155, quantity: 2, unit_cost: 60 },
      { status: 'shipped', cod_amount: 40, quantity: 1, unit_cost: 10 },
      { status: 'returned', cod_amount: 30, quantity: 1, unit_cost: 5 },
      { status: 'cancelled', cod_amount: 20, quantity: 1, unit_cost: 5 },
    ])

    expect(summary).toEqual({
      total_revenue: 155,
      total_fees: 0,
      total_cost: 120,
      order_count: 4,
      shipped_count: 1,
      delivered_count: 1,
      returned_count: 1,
      cancelled_count: 1,
    })
  })

  it('normalizes numeric values returned as strings by PostgreSQL', () => {
    expect(normalizeAnalyticsSummary({
      total_revenue: '155',
      total_fees: '0',
      total_cost: '120',
      order_count: '1',
      shipped_count: '0',
      delivered_count: '1',
      returned_count: '0',
      cancelled_count: '0',
    })).toEqual({
      total_revenue: 155,
      total_fees: 0,
      total_cost: 120,
      order_count: 1,
      shipped_count: 0,
      delivered_count: 1,
      returned_count: 0,
      cancelled_count: 0,
    })
  })

  it('rejects an empty RPC response so the fallback is used', () => {
    expect(normalizeAnalyticsSummary(null)).toBeNull()
  })
})
