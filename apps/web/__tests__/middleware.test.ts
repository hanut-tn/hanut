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
    ]

    for (const path of publicPaths) {
      const response = await middleware(requestFor(path))

      expect(response.headers.get('location')).toBeNull()
    }

    expect(supabaseSsrMock.createServerClient).not.toHaveBeenCalled()
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
    })

    const response = await middleware(requestFor('/dashboard'))

    expect(response.headers.get('location')).toBeNull()
  })
})
