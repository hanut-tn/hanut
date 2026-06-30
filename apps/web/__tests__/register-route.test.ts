import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authClientMock = vi.hoisted(() => ({
  signUp: vi.fn(),
}))

const serviceMock = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}))

const rateLimitMock = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
}))

const turnstileMock = vi.hoisted(() => ({
  verifyTurnstileToken: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: authClientMock })),
}))

vi.mock('@/lib/supabase/service', () => serviceMock)
vi.mock('@/lib/rate-limit', () => rateLimitMock)
vi.mock('@/lib/turnstile', () => turnstileMock)
vi.mock('@/lib/auth-redirect', () => ({
  buildAuthCallbackUrl: vi.fn(() => 'https://hanut.test/api/auth/callback?next=%2Fdashboard'),
}))

import { POST } from '@/app/api/auth/register/route'

function request(overrides: Record<string, unknown> = {}) {
  return new NextRequest('https://hanut.test/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      shop_name: 'Ma Boutique',
      email: 'seller@example.com',
      phone: '22123456',
      password: 'Password1!',
      turnstile_token: 'valid-token',
      terms_accepted: true,
      ...overrides,
    }),
  })
}

function mockServiceClient(options: {
  trialError?: { message: string } | null
  insertError?: { code?: string; message: string } | null
} = {}) {
  const insert = vi.fn().mockResolvedValue({ error: options.insertError ?? null })
  const cleanupEq = vi.fn().mockResolvedValue({ error: null })
  const remove = vi.fn(() => ({ eq: cleanupEq }))
  const from = vi.fn((table: string) => {
    if (table !== 'sellers') throw new Error(`Unexpected table: ${table}`)
    return { insert, delete: remove }
  })
  const rpc = vi.fn().mockResolvedValue({ error: options.trialError ?? null })
  const deleteUser = vi.fn().mockResolvedValue({ error: null })

  serviceMock.createServiceClient.mockReturnValue({
    from,
    rpc,
    auth: { admin: { deleteUser } },
  })

  return { insert, cleanupEq, remove, rpc, deleteUser }
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.getClientIp.mockReturnValue('203.0.113.10')
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: true })
    turnstileMock.verifyTurnstileToken.mockResolvedValue(true)
    authClientMock.signUp.mockResolvedValue({
      data: { user: { id: 'seller-1' }, session: null },
      error: null,
    })
  })

  it('does not create the seller profile before email confirmation', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, session: null })
    expect(serviceMock.createServiceClient).not.toHaveBeenCalled()
    expect(authClientMock.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        data: expect.objectContaining({ hanut_signup: true }),
      }),
    }))
  })

  it('creates the seller immediately only when Supabase returns a session', async () => {
    authClientMock.signUp.mockResolvedValue({
      data: {
        user: { id: 'seller-1' },
        session: { access_token: 'access-token', refresh_token: 'refresh-token' },
      },
      error: null,
    })
    const { insert, rpc, deleteUser } = mockServiceClient()

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'seller-1',
      plan: 'starter',
    }))
    expect(insert.mock.calls[0][0]).not.toHaveProperty('subscription_end')
    expect(rpc).toHaveBeenCalledWith('set_demo_trial', { p_seller_id: 'seller-1' })
    expect(deleteUser).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      success: true,
      session: { access_token: 'access-token', refresh_token: 'refresh-token' },
    })
  })

  it('removes the partial seller and Auth user if trial activation fails', async () => {
    authClientMock.signUp.mockResolvedValue({
      data: {
        user: { id: 'seller-1' },
        session: { access_token: 'access-token', refresh_token: 'refresh-token' },
      },
      error: null,
    })
    const { cleanupEq, remove, deleteUser } = mockServiceClient({
      trialError: { message: 'function set_demo_trial does not exist' },
    })

    const response = await POST(request())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Impossible de créer le profil. Réessayez.',
    })
    expect(remove).toHaveBeenCalled()
    expect(cleanupEq).toHaveBeenCalledWith('id', 'seller-1')
    expect(deleteUser).toHaveBeenCalledWith('seller-1')
  })

  it('keeps an existing seller for the same Auth user idempotently', async () => {
    authClientMock.signUp.mockResolvedValue({
      data: {
        user: { id: 'seller-1' },
        session: { access_token: 'access-token', refresh_token: 'refresh-token' },
      },
      error: null,
    })
    const { deleteUser, rpc } = mockServiceClient({
      insertError: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "sellers_pkey"',
      },
    })

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(deleteUser).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith('set_demo_trial', { p_seller_id: 'seller-1' })
  })

  it('rejects when terms_accepted is false', async () => {
    const response = await POST(request({ terms_accepted: false }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Vous devez accepter les CGU pour continuer.',
    })
  })

  it('does not report duplicate seller emails as server errors', async () => {
    authClientMock.signUp.mockResolvedValue({
      data: {
        user: { id: 'seller-1' },
        session: { access_token: 'access-token', refresh_token: 'refresh-token' },
      },
      error: null,
    })
    const { deleteUser, rpc } = mockServiceClient({
      insertError: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "sellers_email_key"',
      },
    })

    const response = await POST(request())

    expect(response.status).toBe(409)
    expect(deleteUser).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })
})
