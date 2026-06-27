import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../app/api/auth/callback/route'

const authMock = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  getUser: vi.fn(),
}))

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(),
}))

const serviceMock = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: authMock })),
}))

vi.mock('@sentry/nextjs', () => sentryMock)
vi.mock('@/lib/supabase/service', () => serviceMock)

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}))

function callbackRequest(next: string) {
  return new NextRequest(`https://hanut.test/api/auth/callback?next=${encodeURIComponent(next)}`)
}

const originalEnv = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

function mockServiceClient(options: {
  insertError?: { code?: string; message: string } | null
  trialError?: { message: string } | null
} = {}) {
  const insert = vi.fn().mockResolvedValue({ error: options.insertError ?? null })
  const cleanupEq = vi.fn().mockResolvedValue({ error: null })
  const remove = vi.fn(() => ({ eq: cleanupEq }))
  const from = vi.fn((table: string) => {
    if (table !== 'sellers') throw new Error(`Unexpected table: ${table}`)
    return { insert, delete: remove }
  })
  const rpc = vi.fn().mockResolvedValue({ error: options.trialError ?? null })

  serviceMock.createServiceClient.mockReturnValue({ from, rpc })

  return { insert, rpc, remove, cleanupEq }
}

describe('GET /api/auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.exchangeCodeForSession.mockResolvedValue({ data: { user: null }, error: null })
    authMock.verifyOtp.mockResolvedValue({ data: { user: null }, error: null })
    authMock.getUser.mockResolvedValue({ data: { user: null } })
    mockServiceClient()
    delete process.env.RESEND_API_KEY
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    restoreEnv()
  })

  it('allows internal next paths', async () => {
    const response = await GET(callbackRequest('/reset-password'))

    expect(response.headers.get('location')).toBe('https://hanut.test/reset-password')
  })

  it('rejects external next URLs', async () => {
    const response = await GET(callbackRequest('https://evil.test/phishing'))

    expect(response.headers.get('location')).toBe('https://hanut.test/dashboard')
  })

  it('rejects protocol-relative next URLs', async () => {
    const response = await GET(callbackRequest('//evil.test/phishing'))

    expect(response.headers.get('location')).toBe('https://hanut.test/dashboard')
  })

  it.each([
    ['/\\evil.test/phishing'],
    ['/dashboard:https://evil.test'],
    ['/@evil.test'],
  ])('rejects suspicious internal-looking path %s', async (next) => {
    const response = await GET(callbackRequest(next))

    expect(response.headers.get('location')).toBe('https://hanut.test/dashboard')
  })

  it('verifies an invitation token hash before opening the password page', async () => {
    const request = new NextRequest(
      'https://hanut.test/api/auth/callback' +
      '?next=%2Faccept-invitation&token_hash=invite-token&type=invite',
    )

    const response = await GET(request)

    expect(authMock.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'invite-token',
      type: 'invite',
    })
    expect(response.headers.get('location')).toBe('https://hanut.test/accept-invitation')
  })

  it('sends an invalid or expired email link back to login', async () => {
    authMock.verifyOtp.mockResolvedValue({ error: new Error('expired') })
    const request = new NextRequest(
      'https://hanut.test/api/auth/callback' +
      '?next=%2Faccept-invitation&token_hash=expired-token&type=invite',
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe(
      'https://hanut.test/login?auth_error=invalid_or_expired_link',
    )
  })

  it('sends the welcome email for confirmed signups and escapes the shop name', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key'
    process.env.NEXT_PUBLIC_APP_URL = 'https://hanut.test'
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
    authMock.verifyOtp.mockResolvedValue({
      data: {
        user: {
          id: 'seller-1',
          email: 'seller@example.com',
          user_metadata: { name: '<Shop & Co>' },
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    })
    const request = new NextRequest(
      'https://hanut.test/api/auth/callback' +
      '?next=%2Fdashboard&token_hash=signup-token&type=signup',
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('https://hanut.test/verify-email?confirmed=1')
    expect(serviceMock.createServiceClient).toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer resend-test-key',
        }),
      }),
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { html: string; to: string }
    expect(body.to).toBe('seller@example.com')
    expect(body.html).toContain('&lt;Shop &amp; Co&gt;')
    expect(body.html).not.toContain('<Shop & Co>')
  })

  it('creates the seller profile from the current session if the code exchange omits user data', async () => {
    const { insert, rpc } = mockServiceClient()
    authMock.exchangeCodeForSession.mockResolvedValue({
      data: { user: null },
      error: null,
    })
    authMock.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'seller-1',
          email: 'seller@example.com',
          email_confirmed_at: '2026-06-26T12:00:00.000Z',
          user_metadata: { name: 'Seller Shop', phone: '22123456', hanut_signup: true },
          created_at: new Date().toISOString(),
        },
      },
    })
    const request = new NextRequest(
      'https://hanut.test/api/auth/callback?code=auth-code',
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('https://hanut.test/verify-email?confirmed=1')
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'seller-1',
      email: 'seller@example.com',
      name: 'Seller Shop',
      phone: '22123456',
      plan: 'starter',
    }))
    expect(rpc).toHaveBeenCalledWith('set_demo_trial', { p_seller_id: 'seller-1' })
  })

  it('logs welcome email failures without blocking the auth redirect or leaking the email', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key'
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)
    authMock.verifyOtp.mockResolvedValue({
      data: {
        user: {
          id: 'seller-1',
          email: 'seller@example.com',
          user_metadata: { name: 'Seller' },
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    })
    const request = new NextRequest(
      'https://hanut.test/api/auth/callback' +
      '?next=%2Fdashboard&token_hash=signup-token&type=signup',
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('https://hanut.test/verify-email?confirmed=1')
    await vi.waitFor(() => expect(sentryMock.captureException).toHaveBeenCalled())
    const sentryContext = sentryMock.captureException.mock.calls[0][1]
    expect(sentryContext.extra).toEqual({ hasEmail: true })
    expect(sentryContext.extra).not.toHaveProperty('email')
  })

  it('does not create a seller profile for a recently-created account without type=signup', async () => {
    const { insert } = mockServiceClient()
    authMock.exchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          id: 'seller-2',
          email: 'other@example.com',
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    })
    const request = new NextRequest(
      'https://hanut.test/api/auth/callback?code=auth-code',
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('https://hanut.test/dashboard')
    expect(insert).not.toHaveBeenCalled()
  })

  it('shows a setup error if the seller profile cannot be created after confirmation', async () => {
    mockServiceClient({ trialError: { message: 'function set_demo_trial does not exist' } })
    authMock.verifyOtp.mockResolvedValue({
      data: {
        user: {
          id: 'seller-1',
          email: 'seller@example.com',
          user_metadata: { name: 'Seller' },
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    })
    const request = new NextRequest(
      'https://hanut.test/api/auth/callback' +
      '?next=%2Fdashboard&token_hash=signup-token&type=signup',
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe('https://hanut.test/verify-email?confirmed=1&setup_error=1')
    expect(sentryMock.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { module: 'auth_callback', action: 'seller_profile' },
      }),
    )
  })
})
