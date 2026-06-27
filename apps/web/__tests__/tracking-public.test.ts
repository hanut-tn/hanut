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

import { GET } from '../app/api/track/[orderId]/route'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function trackRequest(token: string) {
  return new NextRequest(`https://hanut.test/api/track/${token}`)
}

function makeParams(orderId: string) {
  return { params: Promise.resolve({ orderId }) }
}

function mockSupabaseOrder(order: unknown, delivery: unknown = null) {
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
    maybeSingle: vi.fn().mockResolvedValue({ data: delivery }),
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

describe('GET /api/track/[orderId] — multi-article orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 29, resetIn: 60 })
  })

  it('returns all items for a multi-article order', async () => {
    mockSupabaseOrder({
      id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'shipped',
      cod_amount: 110,
      variant: null,
      quantity: 1,
      created_at: new Date().toISOString(),
      customer: { name: 'Mohamed Trabelsi', city: 'Sfax' },
      product: { name: 'Produit Legacy', image_url: null },
      order_items: [
        { unit_price: 50, quantity: 1, variant: null,  product: { name: 'T-shirt blanc', image_url: null } },
        { unit_price: 30, quantity: 2, variant: 'L',   product: { name: 'Casquette', image_url: 'https://example.com/cap.jpg' } },
      ],
    })

    const response = await GET(trackRequest('multiitemtoken123'), makeParams('multiitemtoken123'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.items).toHaveLength(2)
    expect(json.items[0]).toEqual({
      product_name: 'T-shirt blanc',
      product_image: null,
      variant: null,
      quantity: 1,
      unit_price: 50,
    })
    expect(json.items[1]).toEqual({
      product_name: 'Casquette',
      product_image: 'https://example.com/cap.jpg',
      variant: 'L',
      quantity: 2,
      unit_price: 30,
    })
    expect(json.cod_amount).toBe(110)
  })

  it('returns empty items array for a legacy single-article order', async () => {
    mockSupabaseOrder({
      id: '550e8400-e29b-41d4-a716-446655440001',
      status: 'delivered',
      cod_amount: 85,
      variant: 'M',
      quantity: 2,
      created_at: new Date().toISOString(),
      customer: { name: 'Sara Ben Romdhane', city: 'Tunis' },
      product: { name: 'Robe été', image_url: null },
      order_items: [],
    })

    const response = await GET(trackRequest('legacysingletoken1'), makeParams('legacysingletoken1'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.items).toHaveLength(0)
    expect(json.product_name).toBe('Robe été')
    expect(json.variant).toBe('M')
    expect(json.quantity).toBe(2)
    expect(json.cod_amount).toBe(85)
  })
})

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

  it('returns personal delivery instructions with a validated seller WhatsApp link', async () => {
    mockSupabaseOrder(
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'shipped',
        cod_amount: 50,
        variant: null,
        quantity: 1,
        created_at: new Date().toISOString(),
        seller: { phone: '+216 54 727 060' },
        customer: { name: 'Fatima Ben Ali', city: 'Tunis' },
        product: { name: 'Produit', image_url: null },
      },
      {
        delivery_type: 'self',
        carrier: null,
        tracking_number: null,
        vendor_note: 'Livraison demain matin',
      },
    )

    const response = await GET(trackRequest('selfdeliverytoken'), makeParams('selfdeliverytoken'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.customer_name).toBe('Fatima')
    expect(json.delivery).toEqual({
      delivery_type: 'self',
      carrier: null,
      tracking: null,
      tracking_url: null,
      vendor_note: 'Livraison demain matin',
      seller_whatsapp: 'https://wa.me/21654727060',
    })
    expect(JSON.stringify(json)).not.toContain('+216 54 727 060')
  })
})
