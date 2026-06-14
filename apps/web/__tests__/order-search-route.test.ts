import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { NextRequest as NextRequestCtor } from 'next/server'

const serverMock = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}))

const contextMock = vi.hoisted(() => ({
  getUserContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: serverMock.createServerClient,
}))

vi.mock('@/lib/get-context', () => ({
  getUserContext: contextMock.getUserContext,
}))

import { GET } from '../app/api/orders/route'

function request(search: string) {
  return new NextRequestCtor(new URL(`https://hanut.test/api/orders?search=${encodeURIComponent(search)}`)) as NextRequest
}

function mockContext(sellerId: string | null = 'seller-1') {
  contextMock.getUserContext.mockResolvedValue(
    sellerId
      ? { userId: 'user-1', sellerId, role: 'admin', isSeller: true, plan: 'starter' }
      : null
  )
}

function mockServerClient({
  customers = [{ id: 'customer-1' }],
  orders = [],
  rpcError = null,
}: {
  customers?: { id: string }[]
  orders?: unknown[]
  rpcError?: { message: string } | null
} = {}) {
  const customerQuery = {
    select: vi.fn(() => customerQuery),
    eq: vi.fn(() => customerQuery),
    or: vi.fn(() => customerQuery),
    limit: vi.fn().mockResolvedValue({ data: customers, error: null }),
  }
  const rpc = vi.fn().mockResolvedValue({ data: orders, error: rpcError })
  const from = vi.fn((table: string) => {
    if (table === 'customers') return customerQuery
    throw new Error(`Unexpected table: ${table}`)
  })

  serverMock.createServerClient.mockResolvedValue({ from, rpc })

  return { customerQuery, from, rpc }
}

describe('GET /api/orders search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires authentication', async () => {
    mockContext(null)

    const response = await GET(request('ra'))

    expect(response.status).toBe(401)
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })

  it('requires at least two search characters', async () => {
    mockContext()

    const response = await GET(request('r'))

    expect(response.status).toBe(400)
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })

  it('searches matching customers and delegates UUID-prefix matching to the SQL RPC', async () => {
    mockContext()
    const orders = [{ id: 'order-1' }]
    const { customerQuery, rpc } = mockServerClient({ orders })

    const response = await GET(request('ra,nia(123)'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ orders })
    expect(customerQuery.or).toHaveBeenCalledWith('name.ilike.%rania123%,phone.ilike.%rania123%')
    expect(rpc).toHaveBeenCalledWith('search_orders', {
      p_seller_id: 'seller-1',
      p_search: 'rania123',
      p_customer_ids: ['customer-1'],
      p_limit: 100,
    })
  })

  it('returns Supabase RPC errors', async () => {
    mockContext()
    mockServerClient({ rpcError: { message: 'RPC failed' } })

    const response = await GET(request('rania'))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'RPC failed' })
  })

  it('treats percent and underscore as literal search characters', async () => {
    mockContext()
    const { customerQuery, rpc } = mockServerClient()

    const response = await GET(request('50%_promo'))

    expect(response.status).toBe(200)
    expect(customerQuery.or).toHaveBeenCalledWith(
      String.raw`name.ilike.%50\%\_promo%,phone.ilike.%50\%\_promo%`,
    )
    expect(rpc).toHaveBeenCalledWith('search_orders', {
      p_seller_id: 'seller-1',
      p_search: String.raw`50\%\_promo`,
      p_customer_ids: ['customer-1'],
      p_limit: 100,
    })
  })
})
