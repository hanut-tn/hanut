import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

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

import { GET } from '../app/api/orders/cursor/route'
import { decodeOrderCursor, encodeOrderCursor } from '@/lib/order-cursor'

const IDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
]
const CREATED_AT = '2026-06-13T10:00:00.000Z'

function request(query = '') {
  return new NextRequest(`https://hanut.test/api/orders/cursor${query ? `?${query}` : ''}`)
}

function mockContext(authenticated = true) {
  contextMock.getUserContext.mockResolvedValue(authenticated
    ? { userId: 'user-1', sellerId: 'seller-1', role: 'admin', plan: 'pro' }
    : null)
}

function mockQuery(rows: Array<Record<string, unknown>>, error: { message: string } | null = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    gte: vi.fn(() => query),
    lt: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn().mockResolvedValue({ data: rows, error }),
  }
  serverMock.createServerClient.mockResolvedValue({
    from: vi.fn(() => query),
  })
  return query
}

describe('GET /api/orders/cursor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires authentication', async () => {
    mockContext(false)

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })

  it('rejects malformed cursors and invalid date ranges', async () => {
    mockContext()

    const invalidCursor = await GET(request('cursor=not-a-cursor'))
    const invalidRange = await GET(request(
      'since=2026-06-14T00%3A00%3A00.000Z&until=2026-06-13T00%3A00%3A00.000Z'
    ))

    expect(invalidCursor.status).toBe(400)
    expect(invalidRange.status).toBe(400)
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })

  it('returns a stable composite next cursor', async () => {
    mockContext()
    mockQuery([
      { id: IDS[2], created_at: CREATED_AT },
      { id: IDS[1], created_at: CREATED_AT },
      { id: IDS[0], created_at: CREATED_AT },
    ])

    const response = await GET(request('limit=2'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.orders).toHaveLength(2)
    expect(body.hasNext).toBe(true)
    expect(decodeOrderCursor(body.nextCursor)).toEqual({
      createdAt: CREATED_AT,
      id: IDS[1],
    })
  })

  it('uses created_at and id as the keyset boundary', async () => {
    mockContext()
    const query = mockQuery([{ id: IDS[0], created_at: CREATED_AT }])
    const cursor = encodeOrderCursor({ createdAt: CREATED_AT, id: IDS[1] })

    const response = await GET(request(`cursor=${cursor}&direction=next`))

    expect(response.status).toBe(200)
    expect(query.or).toHaveBeenCalledWith(
      `created_at.lt.${CREATED_AT},and(created_at.eq.${CREATED_AT},id.lt.${IDS[1]})`
    )
    expect(query.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false })
    expect(query.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false })
  })

  it('reverses previous-page query results back to descending order', async () => {
    mockContext()
    mockQuery([
      { id: IDS[1], created_at: '2026-06-13T11:00:00.000Z' },
      { id: IDS[2], created_at: '2026-06-13T12:00:00.000Z' },
    ])
    const cursor = encodeOrderCursor({ createdAt: CREATED_AT, id: IDS[0] })

    const response = await GET(request(`cursor=${cursor}&direction=prev`))
    const body = await response.json()

    expect(body.orders.map((order: { id: string }) => order.id)).toEqual([IDS[2], IDS[1]])
    expect(body.hasNext).toBe(true)
  })
})
