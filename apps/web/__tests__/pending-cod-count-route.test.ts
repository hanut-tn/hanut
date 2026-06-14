import { beforeEach, describe, expect, it, vi } from 'vitest'

const serverMock = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}))

const contextMock = vi.hoisted(() => ({
  getUserContext: vi.fn(),
}))

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: serverMock.createServerClient,
}))

vi.mock('@/lib/get-context', () => ({
  getUserContext: contextMock.getUserContext,
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: sentryMock.captureException,
}))

import { GET } from '../app/api/deliveries/pending-cod-count/route'

function mockContext(role: 'admin' | 'operator' | 'readonly' | null) {
  contextMock.getUserContext.mockResolvedValue(
    role
      ? {
          userId: 'user-1',
          sellerId: 'seller-1',
          role,
          isSeller: role === 'admin',
          plan: 'pro',
        }
      : null,
  )
}

function mockRpc(data: unknown, error: { message: string } | null = null) {
  const single = vi.fn().mockResolvedValue({ data, error })
  const rpc = vi.fn().mockReturnValue({ single })
  serverMock.createServerClient.mockResolvedValue({ rpc })
  return { rpc, single }
}

describe('GET /api/deliveries/pending-cod-count', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires authentication', async () => {
    mockContext(null)

    const response = await GET()

    expect(response.status).toBe(401)
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })

  it('is restricted to admins', async () => {
    mockContext('operator')

    const response = await GET()

    expect(response.status).toBe(403)
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })

  it('returns the exact pending reversal count without caching', async () => {
    mockContext('admin')
    const { rpc } = mockRpc({ pending_reversal_count: '12' })

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ count: 12 })
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(rpc).toHaveBeenCalledWith('get_cod_summary', { p_seller_id: 'seller-1' })
  })

  it('reports RPC failures without exposing the database error', async () => {
    mockContext('admin')
    mockRpc(null, { message: 'permission denied' })

    const response = await GET()

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      count: 0,
      error: 'Impossible de charger le compteur COD.',
    })
    expect(sentryMock.captureException).toHaveBeenCalledOnce()
  })
})
