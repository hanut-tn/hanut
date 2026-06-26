import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../app/api/auth/callback/route'

const authMock = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}))

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: authMock })),
}))

vi.mock('@sentry/nextjs', () => sentryMock)

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

describe('GET /api/auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.exchangeCodeForSession.mockResolvedValue({ error: null })
    authMock.verifyOtp.mockResolvedValue({ error: null })
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

    expect(response.headers.get('location')).toBe('https://hanut.test/dashboard')
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

  it('logs welcome email failures without blocking the auth redirect or leaking the email', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key'
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)
    authMock.verifyOtp.mockResolvedValue({
      data: {
        user: {
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

    expect(response.headers.get('location')).toBe('https://hanut.test/dashboard')
    await vi.waitFor(() => expect(sentryMock.captureException).toHaveBeenCalled())
    const sentryContext = sentryMock.captureException.mock.calls[0][1]
    expect(sentryContext.extra).toEqual({ hasEmail: true })
    expect(sentryContext.extra).not.toHaveProperty('email')
  })
})
