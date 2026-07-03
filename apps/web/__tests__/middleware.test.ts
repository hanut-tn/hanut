import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const supabaseSsrMock = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: supabaseSsrMock.createServerClient,
}))

import { middleware } from '../middleware'

const originalEnv = { ...process.env }

function requestFor(pathname: string) {
  return new NextRequest(new URL(pathname, 'https://hanut.test'))
}

function chainMaybeSingle(data: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  }
  return chain
}

describe('middleware auth boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('leaves marketing and public API routes accessible without auth', async () => {
    const publicPaths = [
      '/features',
      '/pricing',
      '/about',
      '/carriers',
      '/mobile',
      '/roadmap',
      '/contact',
      '/accept-invitation',
      '/api/contact',
      '/api/waitlist',
      '/api/csp-report',
      '/api/auth/register',
      '/api/auth/callback',
      '/api/auth/callback?code=abc123',
      '/api/auth/forgot-password',
      '/api/auth/resend-confirmation',
      '/api/orders/send-otp',
      '/api/orders/verify-otp',
    ]

    for (const path of publicPaths) {
      const response = await middleware(requestFor(path))

      expect(response.headers.get('location')).toBeNull()
    }

    expect(supabaseSsrMock.createServerClient).not.toHaveBeenCalled()
  })

  it('forwards the same nonce and CSP to Next.js rendering and the browser', async () => {
    const response = await middleware(requestFor('/pricing'))
    const responseCsp = response.headers.get('content-security-policy')
    const requestCsp = response.headers.get('x-middleware-request-content-security-policy')
    const requestNonce = response.headers.get('x-middleware-request-x-nonce')
    const nonceFromCsp = responseCsp?.match(/'nonce-([^']+)'/)?.[1]
    const scriptSrc = responseCsp
      ?.split(';')
      .find(directive => directive.trim().startsWith('script-src'))

    expect(responseCsp).toBeTruthy()
    expect(requestCsp).toBe(responseCsp)
    expect(requestNonce).toBe(nonceFromCsp)
    expect(scriptSrc).toContain("'strict-dynamic'")
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain("'unsafe-eval'")
  })

  it('generates a fresh CSP nonce for every request', async () => {
    const first = await middleware(requestFor('/pricing'))
    const second = await middleware(requestFor('/pricing'))

    expect(first.headers.get('x-middleware-request-x-nonce')).toBeTruthy()
    expect(first.headers.get('x-middleware-request-x-nonce')).not.toBe(
      second.headers.get('x-middleware-request-x-nonce'),
    )
  })

  it('redirects authenticated homepage visitors to the dashboard', async () => {
    supabaseSsrMock.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1', email_confirmed_at: '2026-01-01T00:00:00.000Z' } } }),
      },
    })

    const response = await middleware(requestFor('/'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://hanut.test/dashboard')
  })

  it('keeps unauthenticated homepage visitors on the landing page', async () => {
    supabaseSsrMock.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const response = await middleware(requestFor('/'))

    expect(response.headers.get('location')).toBeNull()
  })

  it('redirects protected routes to login when there is no user', async () => {
    supabaseSsrMock.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const response = await middleware(requestFor('/dashboard'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://hanut.test/login')
  })

  it('lets authenticated users reach protected routes', async () => {
    supabaseSsrMock.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1', email_confirmed_at: '2026-01-01T00:00:00.000Z' } } }),
      },
      from: vi.fn().mockReturnValue(chainMaybeSingle({ subscription_end: null })),
    })

    const response = await middleware(requestFor('/dashboard'))

    expect(response.headers.get('location')).toBeNull()
  })

  it('redirects to /billing when demo has expired', async () => {
    const expiredDate = new Date(Date.now() - 1000).toISOString()
    supabaseSsrMock.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1', email_confirmed_at: '2026-01-01T00:00:00.000Z' } } }),
      },
      from: vi.fn().mockReturnValue(chainMaybeSingle({ subscription_end: expiredDate })),
    })

    const response = await middleware(requestFor('/dashboard'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://hanut.test/billing')
  })

  it('allows /api/auth/callback without session', async () => {
    const response = await middleware(requestFor('/api/auth/callback'))
    expect(response.headers.get('location')).toBeNull()
    expect(supabaseSsrMock.createServerClient).not.toHaveBeenCalled()
  })

  it('allows /api/auth/register without session', async () => {
    const response = await middleware(requestFor('/api/auth/register'))
    expect(response.headers.get('location')).toBeNull()
    expect(supabaseSsrMock.createServerClient).not.toHaveBeenCalled()
  })

  it('allows public auth email endpoints without session', async () => {
    const forgotPassword = await middleware(requestFor('/api/auth/forgot-password'))
    const resendConfirmation = await middleware(requestFor('/api/auth/resend-confirmation'))

    expect(forgotPassword.headers.get('location')).toBeNull()
    expect(resendConfirmation.headers.get('location')).toBeNull()
    expect(supabaseSsrMock.createServerClient).not.toHaveBeenCalled()
  })

  it('redirects /dashboard to /login without session', async () => {
    supabaseSsrMock.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const response = await middleware(requestFor('/dashboard'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://hanut.test/login')
  })

  it('redirects team members to /billing when the owner seller demo has expired', async () => {
    const expiredDate = new Date(Date.now() - 1000).toISOString()
    const ownerQuery = chainMaybeSingle(null)
    const membershipQuery = chainMaybeSingle({ seller_id: 'seller-1' })
    const sellerQuery = chainMaybeSingle({ subscription_end: expiredDate })
    let sellerQueryCount = 0
    const from = vi.fn((table: string) => {
      if (table === 'sellers') {
        sellerQueryCount += 1
        return sellerQueryCount === 1 ? ownerQuery : sellerQuery
      }
      if (table === 'team_members') return membershipQuery
      throw new Error(`Unexpected table: ${table}`)
    })

    supabaseSsrMock.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'member-1', email_confirmed_at: '2026-01-01T00:00:00.000Z' } } }),
      },
      from,
    })

    const response = await middleware(requestFor('/dashboard'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://hanut.test/billing')
    expect(membershipQuery.eq).toHaveBeenCalledWith('user_id', 'member-1')
    expect(membershipQuery.eq).toHaveBeenCalledWith('status', 'active')
    expect(sellerQuery.eq).toHaveBeenCalledWith('id', 'seller-1')
  })

  it('skips the sellers DB query for subscription_end when JWT claims contain it (hook active)', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    const header  = btoa(JSON.stringify({ alg: 'HS256' }))
    const payload = btoa(JSON.stringify({ sub: 'seller-1', subscription_end: future }))
    const jwtWithClaims = `${header}.${payload}.fake-sig`

    const fromSpy = vi.fn().mockReturnValue(chainMaybeSingle({ subscription_end: future }))

    supabaseSsrMock.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1', email_confirmed_at: '2026-01-01T00:00:00.000Z' } } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: jwtWithClaims } } }),
      },
      from: fromSpy,
    })

    const response = await middleware(requestFor('/dashboard'))

    expect(response.headers.get('location')).toBeNull()
    expect(fromSpy).not.toHaveBeenCalled()
  })

  it('falls back to sellers DB query when JWT claims are absent (hook not active)', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    const header  = btoa(JSON.stringify({ alg: 'HS256' }))
    const payload = btoa(JSON.stringify({ sub: 'seller-1' })) // pas de subscription_end
    const jwtWithoutClaims = `${header}.${payload}.fake-sig`

    const fromSpy = vi.fn().mockReturnValue(chainMaybeSingle({ subscription_end: future }))

    supabaseSsrMock.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1', email_confirmed_at: '2026-01-01T00:00:00.000Z' } } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: jwtWithoutClaims } } }),
      },
      from: fromSpy,
    })

    const response = await middleware(requestFor('/dashboard'))

    expect(response.headers.get('location')).toBeNull()
    expect(fromSpy).toHaveBeenCalledWith('sellers')
  })
})
