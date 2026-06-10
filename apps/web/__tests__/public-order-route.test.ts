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

const turnstileMock = vi.hoisted(() => ({
  verifyTurnstileToken: vi.fn(),
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

vi.mock('@/lib/turnstile', () => ({
  verifyTurnstileToken: turnstileMock.verifyTurnstileToken,
}))

import { POST } from '../app/api/orders/public/route'

type Seller = {
  id: string
  name: string
  plan?: string
  subscription_end?: string | null
}

type SingleQuery = {
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
    customer_phone: '22222222',
    customer_address: 'Rue 1',
    customer_city: 'Tunis',
    product_id: 'product-1',
    quantity: 2,
    notes: 'Appeler avant livraison',
    turnstile_token: 'turnstile-token',
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

function mockSupabase(
  seller: Seller | null,
  rpcResult: RpcResult,
  product: { id: string; variants?: { size?: string; color?: string; name?: string; qty: number }[] } | null = { id: 'product-1' }
) {
  const sellerQuery = createSingleQuery(seller)
  const productQuery = createSingleQuery(product)
  const orderQuery = createSingleQuery({ tracking_token: 'test-tracking-token' })
  const rpc = vi.fn().mockResolvedValue(rpcResult)
  const from = vi.fn((table: string) => {
    if (table === 'sellers') return sellerQuery
    if (table === 'products') return productQuery
    if (table === 'orders') return orderQuery
    throw new Error(`Unexpected table: ${table}`)
  })

  serviceMock.createServiceClient.mockReturnValue({ from, rpc })

  return { from, rpc, sellerQuery, productQuery, orderQuery }
}

describe('POST /api/orders/public', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetIn: 3600 })
    turnstileMock.verifyTurnstileToken.mockResolvedValue(true)
  })

  it('creates a pending order through the transactional RPC', async () => {
    const { rpc, sellerQuery, productQuery } = mockSupabase(
      { id: 'seller-1', name: 'Demo Shop' },
      { data: 'order-1', error: null }
    )

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, order_id: 'order-1', tracking_token: 'test-tracking-token' })
    expect(rateLimitMock.checkRateLimit).toHaveBeenCalledWith('127.0.0.1', 'orders_public', 10, 60)
    expect(turnstileMock.verifyTurnstileToken).toHaveBeenCalledWith('turnstile-token', '127.0.0.1')
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
        p_customer_phone: '22222222',
        p_customer_address: 'Rue 1',
        p_customer_city: 'Tunis',
        p_customer_id: null,
        p_cod_amount: null,
        p_notes: 'Appeler avant livraison',
        p_status: 'pending',
        p_changed_by: null,
      })
    )
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith('dashboard')
  })

  it('normalizes formatted Tunisian phone numbers before calling the RPC', async () => {
    const { rpc } = mockSupabase(
      { id: 'seller-1', name: 'Demo Shop' },
      { data: 'order-1', error: null }
    )

    const response = await POST(jsonRequest(validBody({ customer_phone: '22 222 222' })))

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith(
      'create_order_with_stock',
      expect.objectContaining({ p_customer_phone: '22222222' })
    )
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

  it('rejects missing or invalid Turnstile tokens before touching the database', async () => {
    turnstileMock.verifyTurnstileToken.mockResolvedValue(false)

    const response = await POST(jsonRequest(validBody({ turnstile_token: undefined })))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Vérification de sécurité échouée. Veuillez recharger la page et réessayer.',
      code: 'CAPTCHA_FAILED',
    })
    expect(turnstileMock.verifyTurnstileToken).toHaveBeenCalledWith('', '127.0.0.1')
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

  it('rejects orders for shops with an expired demo or subscription', async () => {
    const expiredDate = new Date(Date.now() - 1000).toISOString()
    const { rpc } = mockSupabase(
      { id: 'seller-1', name: 'Demo Shop', plan: 'pro', subscription_end: expiredDate },
      { data: 'order-1', error: null }
    )

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Cette boutique n\'accepte plus de commandes pour le moment.',
      code: 'SHOP_INACTIVE',
    })
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

  it('rejects Tunisian phone numbers with unsupported prefixes before calling the RPC', async () => {
    const { rpc } = mockSupabase(
      { id: 'seller-1', name: 'Demo Shop' },
      { data: 'order-1', error: null }
    )

    const response = await POST(jsonRequest(validBody({ customer_phone: '11111111' })))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Numéro de téléphone tunisien invalide' })
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

  it('requires a variant when the product has variants', async () => {
    const { rpc } = mockSupabase(
      { id: 'seller-1', name: 'Demo Shop' },
      { data: 'order-1', error: null },
      { id: 'product-1', variants: [{ size: 'M', color: 'Rouge', qty: 3 }] }
    )

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Veuillez choisir une variante' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('accepts fallback variant labels such as Variante 1', async () => {
    const { rpc } = mockSupabase(
      { id: 'seller-1', name: 'Demo Shop' },
      { data: 'order-1', error: null },
      { id: 'product-1', variants: [{ qty: 3 }] }
    )

    const response = await POST(jsonRequest(validBody({ variant: 'Variante 1' })))

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith(
      'create_order_with_stock',
      expect.objectContaining({ p_variant: 'Variante 1' })
    )
  })

  it('rejects quantities above the selected variant stock before calling the RPC', async () => {
    const { rpc } = mockSupabase(
      { id: 'seller-1', name: 'Demo Shop' },
      { data: 'order-1', error: null },
      { id: 'product-1', variants: [{ size: 'M', color: 'Rouge', qty: 1 }] }
    )

    const response = await POST(jsonRequest(validBody({ variant: 'M / Rouge', quantity: 2 })))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Stock insuffisant pour cette variante' })
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
