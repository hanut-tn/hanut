import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { buildAuthCallbackUrl, getAppOrigin } from '@/lib/auth-redirect'

const originalEnv = { ...process.env }

describe('auth redirect URLs', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_VERCEL_URL
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

  it('builds the team invitation destination explicitly', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://hanut.tn'

    expect(buildAuthCallbackUrl('/dashboard')).toBe(
      'https://hanut.tn/api/auth/callback?next=%2Fdashboard',
    )
  })

  it('falls back to the current origin outside configured production', () => {
    expect(getAppOrigin('https://hanut-preview.vercel.app/path')).toBe(
      'https://hanut-preview.vercel.app',
    )
  })
})
