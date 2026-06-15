import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  decodeCustomerCursor,
  encodeCustomerCursor,
} from '@/lib/customer-cursor'

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

import { GET } from '../app/api/customers/cursor/route'

const IDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
]

function request(query = '') {
  return new NextRequest(`https://hanut.test/api/customers/cursor${query ? `?${query}` : ''}`)
}

function mockContext(authenticated = true) {
  contextMock.getUserContext.mockResolvedValue(authenticated
    ? { userId: 'user-1', sellerId: 'seller-1', role: 'admin', plan: 'pro' }
    : null)
}

function mockRpc(rows: Array<Record<string, unknown>>, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data: rows, error })
  serverMock.createServerClient.mockResolvedValue({ rpc })
  return rpc
}

describe('GET /api/customers/cursor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires authentication', async () => {
    mockContext(false)

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })

  it('round-trips Unicode names in opaque cursors', () => {
    const encoded = encodeCustomerCursor({
      v: 'يوسف Durmuş',
      id: IDS[0],
      s: 'name',
    })

    expect(decodeCustomerCursor(encoded)).toEqual({
      v: 'يوسف Durmuş',
      id: IDS[0],
      s: 'name',
    })
  })

  it('rejects malformed, non-UUID, and wrong-sort cursors', async () => {
    mockContext()

    const malformed = await GET(request('cursor=not-a-cursor'))
    const nonUuid = encodeCustomerCursor({ v: 'A', id: 'not-a-uuid', s: 'name' })
    const invalidId = await GET(request(`cursor=${nonUuid}`))
    const wrongSort = encodeCustomerCursor({ v: '10', id: IDS[0], s: 'order_count' })
    const wrongSortResponse = await GET(request(`sortBy=name&cursor=${wrongSort}`))

    expect(malformed.status).toBe(400)
    expect(invalidId.status).toBe(400)
    expect(wrongSortResponse.status).toBe(400)
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })

  it('passes the composite boundary to the RPC and returns its next cursor', async () => {
    mockContext()
    const rpc = mockRpc([
      { id: IDS[0], name: 'A', order_count: 8 },
      { id: IDS[1], name: 'B', order_count: 7 },
      { id: IDS[2], name: 'C', order_count: 6 },
    ])
    const cursor = encodeCustomerCursor({ v: '9', id: IDS[2], s: 'order_count' })

    const response = await GET(request(`limit=2&sortBy=order_count&cursor=${cursor}`))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.customers).toHaveLength(2)
    expect(body.hasMore).toBe(true)
    expect(decodeCustomerCursor(body.nextCursor)).toEqual({
      v: '7',
      id: IDS[1],
      s: 'order_count',
    })
    expect(rpc).toHaveBeenCalledWith('get_customers_cursor_page', {
      p_seller_id: 'seller-1',
      p_sort_by: 'order_count',
      p_limit: 2,
      p_cursor_value: '9',
      p_cursor_id: IDS[2],
      p_search: null,
    })
  })

  it('falls back to the default page size for an invalid limit', async () => {
    mockContext()
    const rpc = mockRpc([])

    const response = await GET(request('limit=abc'))

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith(
      'get_customers_cursor_page',
      expect.objectContaining({ p_limit: 20 }),
    )
  })
})
