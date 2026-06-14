import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../app/api/auth/callback/route'

const authMock = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: authMock })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}))

function callbackRequest(next: string) {
  return new NextRequest(`https://hanut.test/api/auth/callback?next=${encodeURIComponent(next)}`)
}

describe('GET /api/auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.exchangeCodeForSession.mockResolvedValue({ error: null })
    authMock.verifyOtp.mockResolvedValue({ error: null })
  })

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

  it('verifies an invitation token hash before opening the password page', async () => {
    const request = new NextRequest(
      'https://hanut.test/api/auth/callback' +
      '?next=%2Freset-password&token_hash=invite-token&type=invite',
    )

    const response = await GET(request)

    expect(authMock.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'invite-token',
      type: 'invite',
    })
    expect(response.headers.get('location')).toBe('https://hanut.test/reset-password')
  })

  it('sends an invalid or expired email link back to login', async () => {
    authMock.verifyOtp.mockResolvedValue({ error: new Error('expired') })
    const request = new NextRequest(
      'https://hanut.test/api/auth/callback' +
      '?next=%2Freset-password&token_hash=expired-token&type=invite',
    )

    const response = await GET(request)

    expect(response.headers.get('location')).toBe(
      'https://hanut.test/login?auth_error=invalid_or_expired_link',
    )
  })
})
