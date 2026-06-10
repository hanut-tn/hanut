import { beforeEach, describe, expect, it, vi } from 'vitest'

const serviceMock = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}))

const rateLimitMock = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
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

vi.mock('@/lib/turnstile', () => ({
  verifyTurnstileToken: turnstileMock.verifyTurnstileToken,
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}))

import { POST } from '../app/api/orders/public/route'

function jsonRequest(body: unknown) {
  return new Request('https://hanut.test/api/orders/public', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validBody() {
  return {
    slug: 'demo-shop',
    customer_name: 'Fatima',
    customer_phone: '22222222',
    customer_address: 'Rue 1',
    customer_city: 'Tunis',
    product_id: 'product-1',
    quantity: 1,
    turnstile_token: 'token',
  }
}

function mockSupabaseWithSeller(seller: { id: string; name: string; plan?: string; subscription_end?: string | null } | null) {
  const sellerQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: seller }),
  }
  const productQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'product-1', variants: [] } }),
  }
  const orderQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { tracking_token: 'tok' } }),
  }
  const rpc = vi.fn().mockResolvedValue({ data: 'order-1', error: null })
  serviceMock.createServiceClient.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'sellers') return sellerQuery
      if (table === 'products') return productQuery
      if (table === 'orders') return orderQuery
      throw new Error(`Unexpected table: ${table}`)
    }),
    rpc,
  })
  return { rpc }
}

describe('demo expiry — public order endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetIn: 60 })
    turnstileMock.verifyTurnstileToken.mockResolvedValue(true)
  })

  it('rejects public orders for shops with an expired subscription', async () => {
    const expiredDate = new Date(Date.now() - 60_000).toISOString()
    const { rpc } = mockSupabaseWithSeller({
      id: 'seller-1',
      name: 'Demo Shop',
      plan: 'pro',
      subscription_end: expiredDate,
    })

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      code: 'SHOP_INACTIVE',
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('accepts public orders for shops with a future subscription_end', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { rpc } = mockSupabaseWithSeller({
      id: 'seller-1',
      name: 'Demo Shop',
      plan: 'pro',
      subscription_end: futureDate,
    })

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('create_order_with_stock', expect.objectContaining({ p_seller_id: 'seller-1' }))
  })

  it('accepts public orders for shops with no subscription_end set', async () => {
    const { rpc } = mockSupabaseWithSeller({
      id: 'seller-1',
      name: 'Demo Shop',
      subscription_end: null,
    })

    const response = await POST(jsonRequest(validBody()))

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalled()
  })
})
