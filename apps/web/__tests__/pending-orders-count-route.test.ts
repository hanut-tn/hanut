import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const serverMock = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}))

const contextMock = vi.hoisted(() => ({
  getUserContext: vi.fn(),
}))

const rateLimitMock = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => serverMock)
vi.mock('@/lib/get-context', () => contextMock)
vi.mock('@/lib/rate-limit', () => rateLimitMock)

import { GET } from '@/app/api/orders/pending-count/route'

const request = new NextRequest('https://hanut.test/api/orders/pending-count')

function mockOrdersCount(count: number) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn().mockResolvedValue({ count }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.in.mockReturnValue(query)

  serverMock.createServerClient.mockResolvedValue({
    from: vi.fn(() => query),
  })

  return query
}

describe('GET /api/orders/pending-count', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.getClientIp.mockReturnValue('203.0.113.20')
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: true })
  })

  it('returns the pending and new order count', async () => {
    contextMock.getUserContext.mockResolvedValue({ sellerId: 'seller-1' })
    const query = mockOrdersCount(4)

    const response = await GET(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ count: 4 })
    expect(query.in).toHaveBeenCalledWith('status', ['pending', 'new'])
    expect(rateLimitMock.checkRateLimit).toHaveBeenCalledWith(
      '203.0.113.20',
      'pending_count',
      120,
      60,
    )
  })

  it('returns an empty count without querying auth when rate limited', async () => {
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: false })

    const response = await GET(request)

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({ count: 0 })
    expect(contextMock.getUserContext).not.toHaveBeenCalled()
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })
})
