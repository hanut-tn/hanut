import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'

const serviceMock = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: serviceMock.createServiceClient,
}))

import { POST } from '../app/api/orders/public/route'

type Seller = {
  id: string
  name: string
}

type SellerQuery = {
  select: Mock
  eq: Mock
  single: Mock
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
    customer_phone: '+21611111111',
    customer_address: 'Rue 1',
    customer_city: 'Tunis',
    product_id: 'product-1',
    quantity: 2,
    notes: 'Appeler avant livraison',
    ...overrides,
  }
}

function createSellerQuery(seller: Seller | null): SellerQuery {
  const query = {} as SellerQuery
  query.select = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.single = vi.fn().mockResolvedValue({ data: seller })
  return query
}

function mockSupabase(seller: Seller | null, rpcResult: RpcResult) {
  const sellerQuery = createSellerQuery(seller)
  const rpc = vi.fn().mockResolvedValue(rpcResult)
  const from = vi.fn((table: string) => {
    if (table !== 'sellers') throw new Error(`Unexpected table: ${table}`)
    return sellerQuery
  })

  serviceMock.createServiceClient.mockReturnValue({ from, rpc })

  return { from, rpc, sellerQuery }
}

describe('POST /api/orders/public', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a pending order through the transactional RPC', async () => {
    const { rpc, sellerQuery } = mockSupabase(
      { id: 'seller-1', name: 'Demo Shop' },
      { data: 'order-1', error: null }
    )

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, order_id: 'order-1' })
    expect(sellerQuery.eq).toHaveBeenCalledWith('slug', 'demo-shop')
    expect(rpc).toHaveBeenCalledWith(
      'create_order_with_stock',
      expect.objectContaining({
        p_seller_id: 'seller-1',
        p_product_id: 'product-1',
        p_quantity: 2,
        p_customer_name: 'Fatima',
        p_customer_phone: '+21611111111',
        p_customer_address: 'Rue 1',
        p_customer_city: 'Tunis',
        p_customer_id: null,
        p_cod_amount: null,
        p_notes: 'Appeler avant livraison',
        p_status: 'pending',
      })
    )
  })

  it('returns 404 when the seller slug does not exist', async () => {
    const { rpc } = mockSupabase(null, { data: null, error: null })

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Boutique introuvable' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects invalid quantities before calling the RPC', async () => {
    const { rpc } = mockSupabase(
      { id: 'seller-1', name: 'Demo Shop' },
      { data: 'order-1', error: null }
    )

    const response = await POST(jsonRequest(validBody({ quantity: 0 })))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Quantité invalide' })
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
