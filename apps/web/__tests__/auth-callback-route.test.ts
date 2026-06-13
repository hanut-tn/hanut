import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../app/api/auth/callback/route'

function callbackRequest(next: string) {
  return new NextRequest(`https://hanut.test/api/auth/callback?next=${encodeURIComponent(next)}`)
}

describe('GET /api/auth/callback', () => {
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
})
