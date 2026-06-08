import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'

const serviceMock = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}))

const rateLimitMock = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

const cacheMock = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: serviceMock.createServiceClient,
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: rateLimitMock.checkRateLimit,
  getClientIp: rateLimitMock.getClientIp,
}))

vi.mock('next/cache', () => ({
  revalidateTag: cacheMock.revalidateTag,
}))

import { POST } from '../app/api/orders/public/route'

type Seller = {
  id: string
  name: string
}

type SingleQuery = {
  select: Mock
  eq: Mock
  single: Mock
}

type InsertQuery = {
  insert: Mock
}

type RpcResult = {
  data: string | null
  error: { message: string } | null
}

function jsonRequest(body: unknown) {
  return new Request('https://hanut.test/api/orders/public', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'demo-shop',
    customer_name: 'Fatima',
    customer_phone: '11111111',
    customer_address: 'Rue 1',
    customer_city: 'Tunis',
    product_id: 'product-1',
    quantity: 2,
    notes: 'Appeler avant livraison',
    ...overrides,
  }
}

function createSingleQuery(data: unknown): SingleQuery {
  const query = {} as SingleQuery
  query.select = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.single = vi.fn().mockResolvedValue({ data })
  return query
}

function createInsertQuery(): InsertQuery {
  return { insert: vi.fn().mockResolvedValue({ error: null }) }
}

function mockSupabase(
  seller: Seller | null,
  rpcResult: RpcResult,
  product: { id: string } | null = { id: 'product-1' }
) {
  const sellerQuery = createSingleQuery(seller)
  const productQuery = createSingleQuery(product)
  const orderQuery = createSingleQuery({ tracking_token: 'test-tracking-token' })
  const historyQuery = createInsertQuery()
  const rpc = vi.fn().mockResolvedValue(rpcResult)
  const from = vi.fn((table: string) => {
    if (table === 'sellers') return sellerQuery
    if (table === 'products') return productQuery
    if (table === 'orders') return orderQuery
    if (table === 'order_status_history') return historyQuery
    throw new Error(`Unexpected table: ${table}`)
  })

  serviceMock.createServiceClient.mockReturnValue({ from, rpc })

  return { from, rpc, sellerQuery, productQuery, orderQuery, historyQuery }
}

describe('POST /api/orders/public', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetIn: 3600 })
  })

  it('creates a pending order through the transactional RPC', async () => {
    const { rpc, sellerQuery, productQuery, historyQuery } = mockSupabase(
      { id: 'seller-1', name: 'Demo Shop' },
      { data: 'order-1', error: null }
    )

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, order_id: 'order-1', tracking_token: 'test-tracking-token' })
    expect(rateLimitMock.checkRateLimit).toHaveBeenCalledWith('127.0.0.1', 'orders_public', 10, 60)
    expect(sellerQuery.eq).toHaveBeenCalledWith('slug', 'demo-shop')
    expect(productQuery.eq).toHaveBeenCalledWith('id', 'product-1')
    expect(productQuery.eq).toHaveBeenCalledWith('seller_id', 'seller-1')
    expect(rpc).toHaveBeenCalledWith(
      'create_order_with_stock',
      expect.objectContaining({
        p_seller_id: 'seller-1',
        p_product_id: 'product-1',
        p_quantity: 2,
        p_customer_name: 'Fatima',
        p_customer_phone: '11111111',
        p_customer_address: 'Rue 1',
        p_customer_city: 'Tunis',
        p_customer_id: null,
        p_cod_amount: null,
        p_notes: 'Appeler avant livraison',
        p_status: 'pending',
      })
    )
    expect(historyQuery.insert).toHaveBeenCalledWith({
      order_id: 'order-1',
      status: 'pending',
      changed_by: null,
    })
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith('dashboard')
  })

  it('normalizes formatted Tunisian phone numbers before calling the RPC', async () => {
    const { rpc, historyQuery } = mockSupabase(
      { id: 'seller-1', name: 'Demo Shop' },
      { data: 'order-1', error: null }
    )

    const response = await POST(jsonRequest(validBody({ customer_phone: '11 111 111' })))

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith(
      'create_order_with_stock',
      expect.objectContaining({ p_customer_phone: '11111111' })
    )
    expect(historyQuery.insert).toHaveBeenCalledWith({
      order_id: 'order-1',
      status: 'pending',
      changed_by: null,
    })
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith('dashboard')
  })

  it('returns 429 when the IP exceeds the public order rate limit', async () => {
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetIn: 120 })

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('120')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(serviceMock.createServiceClient).not.toHaveBeenCalled()
    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
  })

  it('returns 404 when the seller slug does not exist', async () => {
    const { rpc } = mockSupabase(null, { data: null, error: null })

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Boutique introuvable' })
    expect(rpc).not.toHaveBeenCalled()
    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
  })

  it('rejects invalid quantities before calling the RPC', async () => {
    const { rpc } = mockSupabase(
      { id: 'seller-1', name: 'Demo Shop' },
      { data: 'order-1', error: null }
    )

    const response = await POST(jsonRequest(validBody({ quantity: 0 })))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Quantité minimum : 1' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects products that do not belong to the seller', async () => {
    const { rpc } = mockSupabase(
      { id: 'seller-1', name: 'Demo Shop' },
      { data: 'order-1', error: null },
      null
    )

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Produit introuvable' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('maps stock errors from the RPC to a 400 response', async () => {
    mockSupabase(
      { id: 'seller-1', name: 'Demo Shop' },
      { data: null, error: { message: 'Stock insuffisant. Il reste 1 unité(s) disponible(s).' } }
    )

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Stock insuffisant. Il reste 1 unité(s) disponible(s).',
    })
  })
})
