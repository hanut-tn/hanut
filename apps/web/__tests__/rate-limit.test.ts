import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { getClientIp } from '@/lib/rate-limit'

const originalEnv = { ...process.env }

describe('getClientIp', () => {
  beforeEach(() => {
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('trusts x-vercel-forwarded-for only on Vercel', () => {
    process.env.VERCEL = '1'
    const headers = new Headers({
      'x-vercel-forwarded-for': '203.0.113.10',
      'x-forwarded-for': '198.51.100.20',
    })

    expect(getClientIp(headers)).toBe('203.0.113.10')
  })

  it('ignores x-vercel-forwarded-for outside Vercel', () => {
    const headers = new Headers({
      'x-vercel-forwarded-for': '203.0.113.10',
      'x-forwarded-for': '198.51.100.20',
    })

    expect(getClientIp(headers)).toBe('198.51.100.20')
  })

  it('uses the first public fallback address', () => {
    const headers = new Headers({
      'x-forwarded-for': '10.0.0.4, 198.51.100.30',
    })

    expect(getClientIp(headers)).toBe('198.51.100.30')
  })

  it('returns anonymous when no usable address is present', () => {
    expect(getClientIp(new Headers())).toBe('anonymous')
  })
})
