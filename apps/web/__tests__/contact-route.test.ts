import { beforeEach, describe, expect, it, vi } from 'vitest'

const serviceMock = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}))

const rateLimitMock = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => '10.0.0.1'),
}))

const turnstileMock = vi.hoisted(() => ({
  verifyTurnstileToken: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: serviceMock.createServiceClient,
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: rateLimitMock.checkRateLimit,
  getClientIp: rateLimitMock.getClientIp,
}))

vi.mock('@/lib/turnstile', () => ({
  verifyTurnstileToken: turnstileMock.verifyTurnstileToken,
}))

import { POST } from '../app/api/contact/route'

const VALID_BODY = {
  name: 'Yasmine Ben Ali',
  email: 'Yasmine@Email.com',
  message: 'Bonjour, j\'ai une question sur le plan Pro.',
  turnstile_token: 'tok',
}

function contactRequest(body: unknown) {
  return new Request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockInsert(insertError: { message: string; code?: string } | null = null) {
  const insert = vi.fn().mockResolvedValue({ error: insertError })
  serviceMock.createServiceClient.mockReturnValue({ from: vi.fn(() => ({ insert })) })
  return insert
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: true, resetIn: 0 })
    turnstileMock.verifyTurnstileToken.mockResolvedValue(true)
  })

  it('retourne 503 si le rate-limit est indisponible', async () => {
    rateLimitMock.checkRateLimit.mockRejectedValue(new Error('db down'))
    const response = await POST(contactRequest(VALID_BODY))
    expect(response.status).toBe(503)
  })

  it('retourne 429 avec Retry-After quand la limite est atteinte', async () => {
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: false, resetIn: 42 })
    const response = await POST(contactRequest(VALID_BODY))
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')
  })

  it('rejette un message trop court', async () => {
    mockInsert()
    const response = await POST(contactRequest({ ...VALID_BODY, message: 'court' }))
    expect(response.status).toBe(400)
  })

  it('rejette un email invalide', async () => {
    mockInsert()
    const response = await POST(contactRequest({ ...VALID_BODY, email: 'pas-un-email' }))
    expect(response.status).toBe(400)
  })

  it('rejette si Turnstile échoue', async () => {
    turnstileMock.verifyTurnstileToken.mockResolvedValue(false)
    mockInsert()
    const response = await POST(contactRequest(VALID_BODY))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('sécurité') })
  })

  it('enregistre le message avec email normalisé', async () => {
    const insert = mockInsert()

    const response = await POST(contactRequest(VALID_BODY))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ message: 'Message envoyé !' })
    expect(insert).toHaveBeenCalledWith({
      name: 'Yasmine Ben Ali',
      email: 'yasmine@email.com',
      message: VALID_BODY.message,
    })
  })

  it('retourne 500 sans détail technique si l\'insert échoue', async () => {
    mockInsert({ message: 'duplicate key value violates unique constraint' })
    const response = await POST(contactRequest(VALID_BODY))
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).not.toContain('constraint')
  })
})
