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

function request() {
  return new NextRequest('https://hanut.test/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      shop_name: 'Ma Boutique',
      email: 'seller@example.com',
      phone: '22123456',
      password: 'Password1!',
      turnstile_token: 'valid-token',
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

  it('creates the seller as Starter then activates the Pro trial through the RPC', async () => {
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
  })

  it('removes the partial seller and Auth user if trial activation fails', async () => {
    const { cleanupEq, remove, deleteUser } = mockServiceClient({
      trialError: { message: 'function set_demo_trial does not exist' },
    })

    const response = await POST(request())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: "Impossible d'activer la démo Pro. Réessayez.",
    })
    expect(remove).toHaveBeenCalled()
    expect(cleanupEq).toHaveBeenCalledWith('id', 'seller-1')
    expect(deleteUser).toHaveBeenCalledWith('seller-1')
  })

  it('does not delete an existing Auth user when Supabase returns a duplicate signup user', async () => {
    const { deleteUser, rpc } = mockServiceClient({
      insertError: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "sellers_pkey"',
      },
    })

    const response = await POST(request())

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'Un compte existe déjà avec cet email. Vérifiez votre boîte mail ou connectez-vous.',
    })
    expect(deleteUser).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('does not report duplicate seller emails as server errors', async () => {
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
