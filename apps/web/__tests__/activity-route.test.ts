import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const serviceMock = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}))

const contextMock = vi.hoisted(() => ({
  getUserContext: vi.fn(),
}))

const csrfMock = vi.hoisted(() => ({
  checkOrigin: vi.fn(() => true),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: serviceMock.createServiceClient,
}))

vi.mock('@/lib/get-context', () => ({
  getUserContext: contextMock.getUserContext,
}))

vi.mock('@/lib/csrf', () => ({
  checkOrigin: csrfMock.checkOrigin,
}))

vi.mock('@/lib/activity', () => ({
  sanitizeDescription: (desc: string) => desc,
}))

import { GET, POST } from '../app/api/activity/route'

function getRequest(params = '') {
  return new Request(`http://localhost:3000/api/activity${params}`, {
    method: 'GET',
  }) as unknown as NextRequest
}

function postRequest(body: unknown) {
  return new Request('http://localhost:3000/api/activity', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

function mockContext(overrides: Record<string, unknown> | null = {}) {
  contextMock.getUserContext.mockResolvedValue(
    overrides === null
      ? null
      : {
          userId: 'user-1',
          sellerId: 'seller-1',
          role: 'admin',
          isSeller: true,
          plan: 'pro',
          ...overrides,
        }
  )
}

type QueryResult = { data: unknown[]; error: { message: string } | null; count: number | null }

function mockListQuery(result: Partial<QueryResult> = {}) {
  const resolved: QueryResult = { data: [], error: null, count: 0, ...result }
  const query: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'range', 'gte', 'in']) {
    query[method] = vi.fn(() => query)
  }
  query.then = (resolve: (value: QueryResult) => unknown) => resolve(resolved)
  serviceMock.createServiceClient.mockReturnValue({ from: vi.fn(() => query) })
  return query
}

function mockInsert(insertError: { message: string } | null = null) {
  const insert = vi.fn().mockResolvedValue({ error: insertError })
  serviceMock.createServiceClient.mockReturnValue({ from: vi.fn(() => ({ insert })) })
  return insert
}

describe('GET /api/activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    csrfMock.checkOrigin.mockReturnValue(true)
  })

  it('exige une authentification', async () => {
    mockContext(null)
    const response = await GET(getRequest())
    expect(response.status).toBe(401)
  })

  it('est réservé aux admins', async () => {
    mockContext({ role: 'operator' })
    const response = await GET(getRequest())
    expect(response.status).toBe(403)
  })

  it('est réservé au plan Pro', async () => {
    mockContext({ plan: 'starter' })
    const response = await GET(getRequest())
    expect(response.status).toBe(403)
  })

  it('retourne les logs filtrés par seller_id du contexte', async () => {
    mockContext()
    const query = mockListQuery({ data: [{ id: 'log-1' }], count: 1 })

    const response = await GET(getRequest('?limit=10'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ logs: [{ id: 'log-1' }], total: 1 })
    expect(query.eq).toHaveBeenCalledWith('seller_id', 'seller-1')
  })

  it('borne le limit à 50', async () => {
    mockContext()
    const query = mockListQuery()

    await GET(getRequest('?limit=500'))

    expect(query.range).toHaveBeenCalledWith(0, 49)
  })
})

describe('POST /api/activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    csrfMock.checkOrigin.mockReturnValue(true)
  })

  it('rejette une origine non autorisée', async () => {
    csrfMock.checkOrigin.mockReturnValue(false)
    const response = await POST(postRequest({ action_type: 'order_created', description: 'test' }))
    expect(response.status).toBe(403)
  })

  it('est réservé aux admins', async () => {
    mockContext({ role: 'operator' })
    const response = await POST(postRequest({ action_type: 'order_created', description: 'test' }))
    expect(response.status).toBe(403)
  })

  it('rejette un action_type hors whitelist', async () => {
    mockContext()
    mockInsert()
    const response = await POST(postRequest({ action_type: 'rm_rf_slash', description: 'test' }))
    expect(response.status).toBe(400)
  })

  it('rejette une metadata trop volumineuse', async () => {
    mockContext()
    mockInsert()
    const response = await POST(postRequest({
      action_type: 'order_created',
      description: 'test',
      metadata: { blob: 'x'.repeat(5_000) },
    }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('Metadata') })
  })

  it('rejette un entity_type trop long', async () => {
    mockContext()
    mockInsert()
    const response = await POST(postRequest({
      action_type: 'order_created',
      description: 'test',
      entity_type: 'e'.repeat(60),
    }))
    expect(response.status).toBe(400)
  })

  it('insère avec seller_id et user_id forcés depuis le contexte', async () => {
    mockContext()
    const insert = mockInsert()

    const response = await POST(postRequest({
      action_type: 'order_created',
      description: 'Commande créée',
      user_name: 'Yusuf',
      entity_type: 'order',
      entity_id: 'order-42',
      // seller_id malveillant ignoré par le schéma
      seller_id: 'autre-vendeur',
    }))

    expect(response.status).toBe(200)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      seller_id: 'seller-1',
      user_id: 'user-1',
      action_type: 'order_created',
      description: 'Commande créée',
      entity_type: 'order',
      entity_id: 'order-42',
    }))
  })

  it('tronque la description à 200 caractères', async () => {
    mockContext()
    const insert = mockInsert()

    await POST(postRequest({
      action_type: 'order_created',
      description: 'd'.repeat(500),
    }))

    const payload = insert.mock.calls[0][0] as { description: string }
    expect(payload.description).toHaveLength(200)
  })
})
