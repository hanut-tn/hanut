import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { buildAuthCallbackUrl, buildAuthEmailActionUrl, getAppOrigin } from '@/lib/auth-redirect'

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
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.hanut.tn/'

    expect(
      buildAuthCallbackUrl('/reset-password', 'https://temporary-preview.vercel.app'),
    ).toBe('https://www.hanut.tn/api/auth/callback?next=%2Freset-password')
  })

  it('builds the team invitation callback to set a password', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.hanut.tn'

    expect(buildAuthCallbackUrl('/accept-invitation')).toBe(
      'https://www.hanut.tn/api/auth/callback?next=%2Faccept-invitation',
    )
  })

  it('omits next=/dashboard because dashboard is the callback default', () => {
    expect(buildAuthCallbackUrl('/dashboard', 'https://www.hanut.tn')).toBe(
      'https://www.hanut.tn/api/auth/callback',
    )
  })

  it('builds direct auth email action URLs with token_hash and type', () => {
    expect(
      buildAuthEmailActionUrl({
        tokenHash: 'invite-token',
        type: 'invite',
        nextPath: '/accept-invitation',
      }, 'https://www.hanut.tn'),
    ).toBe(
      'https://www.hanut.tn/api/auth/callback?token_hash=invite-token&type=invite&next=%2Faccept-invitation',
    )
  })

  it('never emits an auto-generated Vercel deployment URL, even as the request origin', () => {
    expect(getAppOrigin('https://hanut-preview.vercel.app/path')).toBe('https://www.hanut.tn')
  })

  it('uses the request origin instead of localhost for LAN testing', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

    expect(getAppOrigin('http://192.168.1.7:3001/dashboard')).toBe(
      'http://192.168.1.7:3001',
    )
  })

  it('uses the configured app URL over the request origin', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.hanut.tn'

    expect(getAppOrigin('https://hanut-generated.vercel.app')).toBe('https://www.hanut.tn')
  })

  it('falls back to the production domain when no request origin exists', () => {
    process.env.VERCEL_URL = 'hanut-generated.vercel.app'

    expect(getAppOrigin()).toBe('https://www.hanut.tn')
  })

  it('ignores NEXT_PUBLIC_APP_URL itself if it is misconfigured to a Vercel deployment domain', () => {
    // Régression : NEXT_PUBLIC_APP_URL avait été configurée par erreur sur
    // l'alias de branche Vercel (hanut-web-git-main-*.vercel.app), et le
    // code lui faisait confiance sans vérifier — un lien d'invitation
    // pointait alors vers ce domaine au lieu de www.hanut.tn.
    process.env.NEXT_PUBLIC_APP_URL = 'https://hanut-web-git-main-hanut-s-projects.vercel.app'

    expect(getAppOrigin()).toBe('https://www.hanut.tn')
    expect(getAppOrigin('https://hanut-web-git-main-hanut-s-projects.vercel.app')).toBe(
      'https://www.hanut.tn',
    )
  })

  it('rewrites the bare apex domain to www, since hanut.tn redirects and <img> tags do not follow it reliably', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://hanut.tn'

    expect(getAppOrigin()).toBe('https://www.hanut.tn')
  })
})
