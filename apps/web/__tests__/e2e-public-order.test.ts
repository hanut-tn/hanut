import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

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
import { GET } from '../app/api/track/[orderId]/route'

function jsonRequest(body: unknown) {
  return new Request('https://hanut.test/api/orders/public', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'demo-boutique',
    customer_name: 'Fatima Ben Ali',
    customer_phone: '22222222',
    customer_address: '12 Rue de la République',
    customer_city: 'Tunis',
    product_id: 'product-1',
    quantity: 1,
    turnstile_token: 'valid-token',
    ...overrides,
  }
}

type Seller = { id: string; name: string; plan?: string; subscription_end?: string | null }
type Product = { id: string; variants: { size?: string; color?: string; qty: number }[] } | null

function mockSupabase({
  seller = { id: 'seller-1', name: 'Ma Boutique', plan: 'pro', subscription_end: null } as Seller | null,
  product = { id: 'product-1', variants: [] } as Product,
  rpcResult = { data: 'order-1' as string | null, error: null as { message: string } | null },
  trackingToken = 'abcdef1234567890',
} = {}) {
  const sellerQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: seller }),
  }
  const productQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: product }),
  }
  const orderQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { tracking_token: trackingToken } }),
  }
  const rpc = vi.fn().mockResolvedValue(rpcResult)

  serviceMock.createServiceClient.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'sellers') return sellerQuery
      if (table === 'products') return productQuery
      if (table === 'orders') return orderQuery
      throw new Error(`Unexpected table: ${table}`)
    }),
    rpc,
  })

  return { sellerQuery, productQuery, orderQuery, rpc }
}

describe('e2e: flux commande publique', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetIn: 3600 })
    turnstileMock.verifyTurnstileToken.mockResolvedValue(true)
  })

  it('crée une commande pending et retourne un tracking_token', async () => {
    const trackingToken = 'abcdef1234567890'
    const { rpc, sellerQuery, productQuery } = mockSupabase({ trackingToken })

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.order_id).toBe('order-1')
    expect(data.tracking_token).toBe(trackingToken)
    expect(sellerQuery.eq).toHaveBeenCalledWith('slug', 'demo-boutique')
    expect(productQuery.eq).toHaveBeenCalledWith('seller_id', 'seller-1')
    expect(rpc).toHaveBeenCalledWith('create_order_with_stock', expect.objectContaining({
      p_seller_id: 'seller-1',
      p_product_id: 'product-1',
      p_customer_name: 'Fatima Ben Ali',
      p_customer_phone: '22222222',
      p_status: 'pending',
      p_changed_by: null,
    }))
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith('dashboard-seller-1')
  })

  it('retourne 400 quand la RPC signale un stock insuffisant', async () => {
    mockSupabase({
      rpcResult: { data: null, error: { message: 'Stock insuffisant. Il reste 0 unité(s) disponible(s).' } },
    })

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('insuffisant'),
    })
    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
  })

  it('retourne 403 SHOP_INACTIVE quand l\'abonnement de la boutique est expiré', async () => {
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { rpc } = mockSupabase({
      seller: { id: 'seller-1', name: 'Boutique', plan: 'pro', subscription_end: expiredDate },
    })

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: "Cette boutique n'accepte plus de commandes pour le moment.",
      code: 'SHOP_INACTIVE',
    })
    expect(rpc).not.toHaveBeenCalled()
    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
  })

  it('retourne 400 pour un numéro de téléphone tunisien invalide', async () => {
    mockSupabase()

    const response = await POST(jsonRequest(validBody({ customer_phone: '123' })))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('téléphone'),
    })
  })

  it('retourne 429 quand la limite de débit est dépassée', async () => {
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetIn: 120 })

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('120')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(serviceMock.createServiceClient).not.toHaveBeenCalled()
    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
  })

  it('retourne 404 quand le produit appartient à un autre vendeur (cross-tenant)', async () => {
    const { rpc } = mockSupabase({ product: null })

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Produit introuvable' })
    expect(rpc).not.toHaveBeenCalled()
    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
  })

  it('le lien de suivi fonctionne après la création de commande sans exposer l\'UUID interne', async () => {
    const trackingToken = 'abcdef1234567890'
    mockSupabase({ trackingToken })

    // Étape 1 : créer la commande
    const postResponse = await POST(jsonRequest(validBody()))
    expect(postResponse.status).toBe(200)
    const { tracking_token } = await postResponse.json()
    expect(tracking_token).toBe(trackingToken)

    // Étape 2 : configurer le mock pour le GET tracking
    serviceMock.createServiceClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'orders') return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'internal-uuid-ne-pas-exposer',
              status: 'pending',
              cod_amount: 60,
              variant: null,
              quantity: 1,
              created_at: new Date().toISOString(),
              customer: { name: 'Fatima Ben Ali', city: 'Tunis' },
              product: { name: 'Produit Test', image_url: null },
            },
          }),
        }
        if (table === 'deliveries') return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }
        if (table === 'order_status_history') return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [] }),
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    })

    // Étape 3 : appeler l'endpoint de suivi
    const trackReq = new NextRequest(`https://hanut.test/api/track/${tracking_token}`)
    const trackResponse = await GET(trackReq, { params: Promise.resolve({ orderId: tracking_token }) })

    expect(trackResponse.status).toBe(200)
    const trackData = await trackResponse.json()

    // L'UUID interne ne doit pas apparaître dans la réponse
    expect('id' in trackData).toBe(false)
    expect('full_id' in trackData).toBe(false)
    // order_id est dérivé du tracking token (8 premiers chars en majuscules)
    expect(trackData.order_id).toBe(tracking_token.slice(0, 8).toUpperCase())
    expect(trackData.status).toBe('pending')
  })
})
