import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const serviceMock = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}))

const rateLimitMock = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: serviceMock.createServiceClient,
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: rateLimitMock.checkRateLimit,
  getClientIp: rateLimitMock.getClientIp,
}))

vi.mock('@/lib/constants', () => ({
  CARRIER_TRACKING_URLS: {
    intigo: 'https://intigo.tn/tracking/',
    navex: 'https://navex.tn/tracking/',
    adex: 'https://adex.tn/tracking/',
    aramex: 'https://aramex.com/track/',
    bestdelivery: 'https://best-delivery.tn/tracking/',
  },
}))

import { GET } from '../app/api/track/[orderId]/route'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function trackRequest(token: string) {
  return new NextRequest(`https://hanut.test/api/track/${token}`)
}

function makeParams(orderId: string) {
  return { params: Promise.resolve({ orderId }) }
}

function mockSupabaseOrder(order: unknown) {
  const orderQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: order }),
  }
  const deliveryQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  }
  const historyQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [] }),
  }
  serviceMock.createServiceClient.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'orders') return orderQuery
      if (table === 'deliveries') return deliveryQuery
      if (table === 'order_status_history') return historyQuery
      throw new Error(`Unexpected table: ${table}`)
    }),
  })
}

describe('GET /api/track/[orderId] — data exposure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 29, resetIn: 60 })
  })

  it('never exposes the internal UUID in the response', async () => {
    const internalUuid = '550e8400-e29b-41d4-a716-446655440000'
    mockSupabaseOrder({
      id: internalUuid,
      status: 'pending',
      cod_amount: 50,
      variant: null,
      quantity: 1,
      created_at: new Date().toISOString(),
      customer: { name: 'Fatima', city: 'Tunis' },
      product: { name: 'Produit', image_url: null },
    })

    const response = await GET(trackRequest('abc123token'), makeParams('abc123token'))
    const json = await response.json()

    expect(response.status).toBe(200)
    // No field named 'id' or 'full_id' in the response
    expect('id' in json).toBe(false)
    expect('full_id' in json).toBe(false)
    // order_id should be derived from the public tracking token, NOT the internal UUID
    expect(UUID_RE.test(json.order_id)).toBe(false)
    expect(json.order_id).toBe('ABC123TO')
  })

  it('returns 404 for an unknown tracking token', async () => {
    mockSupabaseOrder(null)

    const response = await GET(trackRequest('unknowntoken123'), makeParams('unknowntoken123'))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Commande introuvable' })
  })

  it('returns 400 for tokens shorter than 8 characters', async () => {
    const response = await GET(trackRequest('short'), makeParams('short'))

    expect(response.status).toBe(400)
    expect(serviceMock.createServiceClient).not.toHaveBeenCalled()
  })
})
