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
      '/api/contact',
      '/api/waitlist',
      '/api/csp-report',
      '/api/auth/register',
      '/api/auth/callback',
      '/api/auth/callback?code=abc123',
    ]

    for (const path of publicPaths) {
      const response = await middleware(requestFor(path))

      expect(response.headers.get('location')).toBeNull()
    }

    expect(supabaseSsrMock.createServerClient).not.toHaveBeenCalled()
  })

  it('redirects authenticated homepage visitors to the dashboard', async () => {
    supabaseSsrMock.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1' } } }),
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
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1' } } }),
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
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1' } } }),
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
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'member-1' } } }),
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
})
