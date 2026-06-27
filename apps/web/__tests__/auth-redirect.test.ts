import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { buildAuthCallbackUrl, getAppOrigin } from '@/lib/auth-redirect'

const originalEnv = { ...process.env }

describe('auth redirect URLs', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_VERCEL_URL
    delete process.env.VERCEL_ENV
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL
    delete process.env.VERCEL_URL
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('uses the canonical app URL instead of a temporary deployment origin', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://hanut.tn/'

    expect(
      buildAuthCallbackUrl('/reset-password', 'https://temporary-preview.vercel.app'),
    ).toBe('https://hanut.tn/api/auth/callback?next=%2Freset-password')
  })

  it('builds the team invitation callback to set a password', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://hanut.tn'

    expect(buildAuthCallbackUrl('/accept-invitation')).toBe(
      'https://hanut.tn/api/auth/callback?next=%2Faccept-invitation',
    )
  })

  it('omits next=/dashboard because dashboard is the callback default', () => {
    expect(buildAuthCallbackUrl('/dashboard', 'https://hanut.tn')).toBe(
      'https://hanut.tn/api/auth/callback',
    )
  })

  it('falls back to the current origin outside configured production', () => {
    process.env.NEXT_PUBLIC_VERCEL_URL = 'hanut-generated.vercel.app'

    expect(getAppOrigin('https://hanut-preview.vercel.app/path')).toBe(
      'https://hanut-preview.vercel.app',
    )
  })

  it('uses Vercel production domain before generated deployment URLs in production', () => {
    process.env.VERCEL_ENV = 'production'
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'hanut.tn'
    process.env.NEXT_PUBLIC_VERCEL_URL = 'hanut-generated.vercel.app'

    expect(getAppOrigin('https://hanut-generated.vercel.app')).toBe('https://hanut.tn')
  })

  it('can fall back to the server-side Vercel deployment URL when no request origin exists', () => {
    process.env.VERCEL_URL = 'hanut-generated.vercel.app'

    expect(getAppOrigin()).toBe('https://hanut-generated.vercel.app')
  })
})
