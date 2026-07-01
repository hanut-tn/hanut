import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

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

vi.mock('@/lib/turnstile', () => ({
  verifyTurnstileToken: turnstileMock.verifyTurnstileToken,
}))

vi.mock('@/lib/csrf', () => ({
  checkOrigin: vi.fn(() => true),
}))

vi.mock('next/cache', () => ({
  revalidateTag: cacheMock.revalidateTag,
}))

import { POST as sendOtp } from '../app/api/orders/send-otp/route'
import { POST as verifyOtp } from '../app/api/orders/verify-otp/route'

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111'

function sendRequest(overrides: Record<string, unknown> = {}) {
  return new NextRequest('https://hanut.test/api/orders/send-otp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://hanut.test' },
    body: JSON.stringify({
      slug: 'demo-shop',
      email: 'CLIENT@Example.com',
      turnstile_token: 'send-token',
      ...overrides,
    }),
  })
}

function verifyRequest(overrides: Record<string, unknown> = {}) {
  return new NextRequest('https://hanut.test/api/orders/verify-otp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://hanut.test' },
    body: JSON.stringify({
      slug: 'demo-shop',
      email: 'client@example.com',
      code: '1234',
      customer_name: 'Fatima Ben Ali',
      customer_phone: '22 222 222',
      customer_governorate: 'Tunis',
      customer_city: 'Tunis Ville',
      customer_delegation: 'Bab Bhar',
      customer_address: 'Rue 1',
      customer_landmark: 'Près de la poste',
      customer_postal_code: '1000',
      delivery_notes: 'Appeler avant livraison',
      product_id: PRODUCT_ID,
      quantity: 1,
      turnstile_token: 'verify-token',
      ...overrides,
    }),
  })
}

function makeDeleteQuery() {
  const query = {
    eq: vi.fn(() => query),
  }
  return query
}

function mockSendClient() {
  const sellerQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: 'seller-1', name: '<Demo>', subscription_end: null },
      error: null,
    }),
  }
  const deleteQuery = makeDeleteQuery()
  const otpQuery = {
    upsert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'otp-1' }, error: null }),
    delete: vi.fn(() => deleteQuery),
  }
  const from = vi.fn((table: string) => {
    if (table === 'sellers') return sellerQuery
    if (table === 'order_otps') return otpQuery
    throw new Error(`Unexpected table: ${table}`)
  })
  serviceMock.createServiceClient.mockReturnValue({ from })
  return { otpQuery }
}

function mockVerifyRpc(result: Record<string, unknown>) {
  const rpc = vi.fn().mockResolvedValue({ data: result, error: null })
  serviceMock.createServiceClient.mockReturnValue({ rpc })
  return rpc
}

describe('public order OTP routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('OTP_HMAC_SECRET', 'test-otp-hmac-secret')
    vi.stubEnv('RESEND_API_KEY', '')
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 2, resetIn: 600 })
    turnstileMock.verifyTurnstileToken.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('rejects OTP sending without a Turnstile token', async () => {
    const response = await sendOtp(sendRequest({ turnstile_token: undefined }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Vérification de sécurité requise',
    })
    expect(turnstileMock.verifyTurnstileToken).not.toHaveBeenCalled()
    expect(rateLimitMock.checkRateLimit).not.toHaveBeenCalled()
    expect(serviceMock.createServiceClient).not.toHaveBeenCalled()
  })

  it('rejects OTP sending with an empty Turnstile token', async () => {
    const response = await sendOtp(sendRequest({ turnstile_token: '' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Vérification de sécurité requise',
    })
    expect(turnstileMock.verifyTurnstileToken).not.toHaveBeenCalled()
    expect(rateLimitMock.checkRateLimit).not.toHaveBeenCalled()
    expect(serviceMock.createServiceClient).not.toHaveBeenCalled()
  })

  it('rejects OTP verification without a Turnstile token', async () => {
    const response = await verifyOtp(verifyRequest({ turnstile_token: undefined }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Vérification de sécurité requise',
    })
    expect(turnstileMock.verifyTurnstileToken).not.toHaveBeenCalled()
    expect(rateLimitMock.checkRateLimit).not.toHaveBeenCalled()
    expect(serviceMock.createServiceClient).not.toHaveBeenCalled()
  })

  it('rejects OTP verification with an empty Turnstile token', async () => {
    const response = await verifyOtp(verifyRequest({ turnstile_token: '' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Vérification de sécurité requise',
    })
    expect(turnstileMock.verifyTurnstileToken).not.toHaveBeenCalled()
    expect(rateLimitMock.checkRateLimit).not.toHaveBeenCalled()
    expect(serviceMock.createServiceClient).not.toHaveBeenCalled()
  })

  it('protects OTP sending with two rate limits and Turnstile', async () => {
    const { otpQuery } = mockSendClient()

    const response = await sendOtp(sendRequest())

    expect(response.status).toBe(200)
    expect(rateLimitMock.checkRateLimit).toHaveBeenCalledTimes(2)
    expect(turnstileMock.verifyTurnstileToken).toHaveBeenCalledWith('send-token', '127.0.0.1')
    expect(otpQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'demo-shop',
        seller_id: 'seller-1',
        email: 'client@example.com',
        code_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
        attempts: 0,
        verified: false,
      }),
      { onConflict: 'seller_id,email' },
    )
  })

  it('creates an order only through the atomic OTP RPC', async () => {
    const rpc = mockVerifyRpc({
      ok: true,
      order_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      tracking_token: 'tracking-token',
      seller_id: 'seller-1',
    })

    const response = await verifyOtp(verifyRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      order_id: 'AAAAAAAA',
      tracking_token: 'tracking-token',
    })
    expect(rpc).toHaveBeenCalledWith(
      'create_public_order_with_otp',
      expect.objectContaining({
        p_slug: 'demo-shop',
        p_email: 'client@example.com',
        p_code_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
        p_customer_phone: '22222222',
        p_customer_governorate: 'Tunis',
        p_customer_city: 'Tunis Ville',
        p_customer_delegation: 'Bab Bhar',
        p_customer_address: 'Rue 1',
        p_customer_landmark: 'Près de la poste',
        p_customer_postal_code: '1000',
        p_delivery_notes: 'Appeler avant livraison',
      }),
    )
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith('dashboard-seller-1')
  })

  it('strips client supplied unit_price from public order items', async () => {
    const rpc = mockVerifyRpc({
      ok: true,
      order_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      tracking_token: 'tracking-token',
      seller_id: 'seller-1',
    })

    const response = await verifyOtp(verifyRequest({
      product_id: undefined,
      quantity: undefined,
      items: [
        { product_id: PRODUCT_ID, quantity: 2, unit_price: 0 },
      ],
    }))

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith(
      'create_public_order_with_otp',
      expect.objectContaining({
        p_product_id: null,
        p_quantity: 1,
        p_items: [
          { product_id: PRODUCT_ID, quantity: 2 },
        ],
      }),
    )
  })

  it('does not consume the recipient quota when Turnstile fails', async () => {
    turnstileMock.verifyTurnstileToken.mockResolvedValue(false)

    const response = await sendOtp(sendRequest())

    expect(response.status).toBe(403)
    expect(rateLimitMock.checkRateLimit).not.toHaveBeenCalled()
    expect(serviceMock.createServiceClient).not.toHaveBeenCalled()
  })

  it('maps exhausted OTP attempts without creating a command', async () => {
    mockVerifyRpc({ ok: false, error: 'OTP_TOO_MANY_ATTEMPTS' })

    const response = await verifyOtp(verifyRequest())

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({
      error: 'Trop de codes incorrects. Demandez un nouveau code.',
    })
    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
  })

  it('keeps stock failures retryable with a fresh OTP attempt', async () => {
    mockVerifyRpc({
      ok: false,
      error: 'ORDER_CREATION_FAILED',
      detail: 'variant_insufficient_stock',
    })

    const response = await verifyOtp(verifyRequest())

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: "Stock insuffisant. Ce produit vient d'être épuisé.",
    })
  })

  it('sends a seller notification email after successful order creation', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key')

    const rpc = vi.fn().mockResolvedValue({
      data: {
        ok: true,
        order_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        tracking_token: 'tracking-token',
        seller_id: 'seller-1',
      },
      error: null,
    })
    const sellerQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { email: 'vendeur@test.com', name: 'Ma Boutique' },
        error: null,
      }),
    }
    const productQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { name: 'T-shirt', price: 50 }, error: null }),
    }
    serviceMock.createServiceClient
      .mockReturnValueOnce({ rpc })
      .mockReturnValue({
        from: (table: string) => {
          if (table === 'sellers') return sellerQuery
          if (table === 'products') return productQuery
          throw new Error(`Unexpected table in notify: ${table}`)
        },
      })

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('{"id":"email-1"}', { status: 200 })
    )

    const response = await verifyOtp(verifyRequest())
    expect(response.status).toBe(200)

    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({ method: 'POST' })
      )
    })

    const call = fetchSpy.mock.calls.find(c => c[0] === 'https://api.resend.com/emails')
    const body = JSON.parse(call![1]!.body as string)
    expect(body.to).toBe('vendeur@test.com')
    expect(body.subject).toContain('Fatima Ben Ali')

    fetchSpy.mockRestore()
  })

  it('does not fail the route when seller notification email errors', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key')

    const rpc = vi.fn().mockResolvedValue({
      data: {
        ok: true,
        order_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        tracking_token: 'tracking-token-2',
        seller_id: 'seller-1',
      },
      error: null,
    })
    const sellerQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { email: 'vendeur@test.com', name: 'Ma Boutique' },
        error: null,
      }),
    }
    const productQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    serviceMock.createServiceClient
      .mockReturnValueOnce({ rpc })
      .mockReturnValue({
        from: (table: string) => {
          if (table === 'sellers') return sellerQuery
          if (table === 'products') return productQuery
          throw new Error(`Unexpected table in notify: ${table}`)
        },
      })

    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Resend down'))

    const response = await verifyOtp(verifyRequest())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      order_id: 'BBBBBBBB',
      tracking_token: 'tracking-token-2',
    })

    fetchSpy.mockRestore()
  })
})
