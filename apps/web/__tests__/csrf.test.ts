import { afterEach, describe, expect, it } from 'vitest'
import { checkOrigin } from '@/lib/csrf'

const ORIGINAL_ENV = { ...process.env }

function request(url: string, headers?: Record<string, string>) {
  return new Request(url, { headers })
}

describe('checkOrigin', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('allows requests in dev when no app origin is configured', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.VERCEL_URL
    delete process.env.NEXT_PUBLIC_VERCEL_URL

    expect(checkOrigin(request('http://localhost:3000/api/team'))).toBe(true)
  })

  it('allows the configured app origin exactly', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://hanut.tn'

    expect(checkOrigin(request('https://hanut.tn/api/team', {
      origin: 'https://hanut.tn',
    }))).toBe(true)
  })

  it('allows same-origin Vercel previews via the request URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://hanut.tn'
    process.env.VERCEL_URL = 'hanut-preview.vercel.app'

    expect(checkOrigin(request('https://hanut-preview.vercel.app/api/team', {
      origin: 'https://hanut-preview.vercel.app',
    }))).toBe(true)
  })

  it('rejects prefix-spoofed origins', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://hanut.tn'

    expect(checkOrigin(request('https://hanut.tn/api/team', {
      origin: 'https://hanut.tn.attacker.com',
    }))).toBe(false)
  })

  it('falls back to referer only when origin is missing', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://hanut.tn'

    expect(checkOrigin(request('https://hanut.tn/api/team', {
      referer: 'https://hanut.tn/settings?tab=team',
    }))).toBe(true)
  })

  it('rejects configured production requests without origin or referer', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://hanut.tn'

    expect(checkOrigin(request('https://hanut.tn/api/team'))).toBe(false)
  })
})
