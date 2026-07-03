import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

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

const emailMock = vi.hoisted(() => ({
  sendSignupConfirmationEmail: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => serviceMock)
vi.mock('@/lib/rate-limit', () => rateLimitMock)
vi.mock('@/lib/turnstile', () => turnstileMock)
vi.mock('@/lib/email', () => emailMock)
vi.mock('@/lib/auth-redirect', () => ({
  buildAuthCallbackUrl: vi.fn(() => 'https://hanut.test/api/auth/callback?next=%2Fdashboard'),
  buildAuthEmailActionUrl: vi.fn(({ tokenHash }) => `https://hanut.test/api/auth/callback?token_hash=${tokenHash}&type=signup`),
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
  generateError?: { message: string } | null
  actionLink?: string | null
  hashedToken?: string | null
} = {}) {
  const from = vi.fn()
  const rpc = vi.fn()
  const generateLink = vi.fn().mockResolvedValue({
    data: {
      user: { id: 'seller-1' },
      properties: {
        action_link: options.actionLink ?? 'https://supabase.test/verify?token=signup-token',
        hashed_token: options.hashedToken ?? 'signup-token',
      },
    },
    error: options.generateError ?? null,
  })
  const deleteUser = vi.fn().mockResolvedValue({ error: null })

  serviceMock.createServiceClient.mockReturnValue({
    from,
    rpc,
    auth: { admin: { generateLink, deleteUser } },
  })

  return { from, rpc, generateLink, deleteUser }
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.getClientIp.mockReturnValue('203.0.113.10')
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: true })
    turnstileMock.verifyTurnstileToken.mockResolvedValue(true)
    emailMock.sendSignupConfirmationEmail.mockResolvedValue(undefined)
    mockServiceClient()
  })

  it('generates a signup link and does not create the seller profile before email confirmation', async () => {
    const { from, rpc, generateLink } = mockServiceClient()
    const response = await POST(request())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, session: null })
    expect(from).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
    expect(generateLink).toHaveBeenCalledWith(expect.objectContaining({
      type: 'signup',
      email: 'seller@example.com',
      password: 'Password1!',
      options: expect.objectContaining({
        data: expect.objectContaining({ hanut_signup: true }),
        redirectTo: 'https://hanut.test/api/auth/callback?next=%2Fdashboard',
      }),
    }))
    expect(emailMock.sendSignupConfirmationEmail).toHaveBeenCalledWith({
      to: 'seller@example.com',
      name: 'Ma Boutique',
      confirmationUrl: 'https://hanut.test/api/auth/callback?token_hash=signup-token&type=signup',
    })
  })

  it('removes the Auth user if the confirmation email cannot be sent', async () => {
    const { deleteUser } = mockServiceClient()
    emailMock.sendSignupConfirmationEmail.mockRejectedValue(new Error('Resend down'))

    const response = await POST(request())

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: "Impossible d'envoyer l'email de confirmation. Réessayez.",
    })
    expect(deleteUser).toHaveBeenCalledWith('seller-1')
  })

  it('maps duplicate Auth emails to a clear login message', async () => {
    mockServiceClient({
      generateError: { message: 'User already registered' },
    })

    const response = await POST(request())

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'Un compte existe déjà avec cet email. Connectez-vous.',
    })
    expect(emailMock.sendSignupConfirmationEmail).not.toHaveBeenCalled()
  })

  it('rejects when terms_accepted is false', async () => {
    const response = await POST(request({ terms_accepted: false }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Vous devez accepter les CGU pour continuer.',
    })
  })

  it('returns a generic error when the signup link cannot be generated', async () => {
    mockServiceClient({
      generateError: { message: 'Auth service unavailable' },
    })

    const response = await POST(request())

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Impossible de créer le compte. Réessayez ou contactez le support.',
    })
    expect(emailMock.sendSignupConfirmationEmail).not.toHaveBeenCalled()
  })
})
