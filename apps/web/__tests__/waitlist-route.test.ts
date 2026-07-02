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

import { POST } from '../app/api/waitlist/route'

function waitlistRequest(body: unknown) {
  return new Request('http://localhost:3000/api/waitlist', {
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

describe('POST /api/waitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: true, resetIn: 0 })
    turnstileMock.verifyTurnstileToken.mockResolvedValue(true)
  })

  it('retourne 429 quand la limite est atteinte', async () => {
    rateLimitMock.checkRateLimit.mockResolvedValue({ allowed: false, resetIn: 60 })
    const response = await POST(waitlistRequest({ email: 'a@b.tn' }))
    expect(response.status).toBe(429)
  })

  it('rejette un email invalide', async () => {
    mockInsert()
    const response = await POST(waitlistRequest({ email: 'nope' }))
    expect(response.status).toBe(400)
  })

  it('rejette si Turnstile échoue', async () => {
    turnstileMock.verifyTurnstileToken.mockResolvedValue(false)
    mockInsert()
    const response = await POST(waitlistRequest({ email: 'a@b.tn', turnstile_token: 'bad' }))
    expect(response.status).toBe(400)
  })

  it('inscrit avec email normalisé', async () => {
    const insert = mockInsert()

    const response = await POST(waitlistRequest({ email: '  Contact@Boutique.TN ', turnstile_token: 'tok' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ message: 'Inscrit avec succès !' })
    expect(insert).toHaveBeenCalledWith({ email: 'contact@boutique.tn' })
  })

  it('répond gentiment aux doublons (23505) sans erreur', async () => {
    mockInsert({ message: 'duplicate', code: '23505' })

    const response = await POST(waitlistRequest({ email: 'a@b.tn', turnstile_token: 'tok' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ message: 'Déjà inscrit !' })
  })

  it('retourne 500 sur une autre erreur d\'insert', async () => {
    mockInsert({ message: 'connection refused' })
    const response = await POST(waitlistRequest({ email: 'a@b.tn', turnstile_token: 'tok' }))
    expect(response.status).toBe(500)
  })
})
