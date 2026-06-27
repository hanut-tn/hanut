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
      'x-real-ip': '203.0.113.11',
      'x-forwarded-for': '198.51.100.20',
    })

    expect(getClientIp(headers)).toBe('203.0.113.10')
  })

  it('ignores all client headers outside Vercel and returns unverified-ip', () => {
    const headers = new Headers({
      'x-vercel-forwarded-for': '203.0.113.10',
      'x-real-ip': '203.0.113.40',
      'x-forwarded-for': '198.51.100.20',
    })

    expect(getClientIp(headers)).toBe('unverified-ip')
  })

  it('returns unverified-ip when no headers are present outside Vercel', () => {
    expect(getClientIp(new Headers())).toBe('unverified-ip')
  })

  it('uses x-real-ip before x-forwarded-for on Vercel', () => {
    process.env.VERCEL = '1'
    const headers = new Headers({
      'x-real-ip': '203.0.113.40',
      'x-forwarded-for': '198.51.100.20',
    })

    expect(getClientIp(headers)).toBe('203.0.113.40')
  })

  it('uses the first public x-forwarded-for address on Vercel', () => {
    process.env.VERCEL = '1'
    const headers = new Headers({
      'x-forwarded-for': '10.0.0.4, 198.51.100.30',
    })

    expect(getClientIp(headers)).toBe('198.51.100.30')
  })

  it('returns anonymous when no usable address is present on Vercel', () => {
    process.env.VERCEL = '1'
    expect(getClientIp(new Headers())).toBe('anonymous')
  })
})
