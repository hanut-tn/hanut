import { beforeEach, describe, expect, it, vi } from 'vitest'
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

import { POST } from '../app/api/orders/send-otp/route'

function request() {
  return new NextRequest('https://hanut.test/api/orders/send-otp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://hanut.test',
    },
    body: JSON.stringify({
      slug: 'demo-shop',
      email: 'client@example.com',
      turnstile_token: 'token',
    }),
  })
}

function mockSeller(subscriptionEnd: string | null) {
  const sellerQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        id: 'seller-1',
        name: 'Demo Shop',
        subscription_end: subscriptionEnd,
      },
      error: null,
    }),
  }

  serviceMock.createServiceClient.mockReturnValue({
    from: vi.fn(() => sellerQuery),
  })
}

describe('demo expiry — OTP email endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 2, resetIn: 600 })
    turnstileMock.verifyTurnstileToken.mockResolvedValue(true)
  })

  it('rejects OTP emails for expired shops before creating a code', async () => {
    mockSeller(new Date(Date.now() - 60_000).toISOString())

    const response = await POST(request())

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Cette boutique n’accepte plus de commandes.',
    })
  })
})
