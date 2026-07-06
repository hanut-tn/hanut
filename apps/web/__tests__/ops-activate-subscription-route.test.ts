import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const serviceMock = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}))

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: serviceMock.createServiceClient,
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: sentryMock.captureException,
}))

// OPS_WEBHOOK_SECRET est lu au chargement du module — il faut le poser
// avant l'import dynamique de la route.
let POST: (req: NextRequest) => Promise<Response>

beforeAll(async () => {
  process.env.OPS_WEBHOOK_SECRET = 'test-ops-secret'
  ;({ POST } = await import('../app/api/ops/activate-subscription/route'))
})

const SELLER_ID = '11111111-2222-3333-4444-555555555555'

function opsRequest(body: unknown, bearer: string | null = 'test-ops-secret') {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (bearer !== null) headers.authorization = `Bearer ${bearer}`
  return new Request('http://localhost:3000/api/ops/activate-subscription', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

function mockRpc(result: { data?: unknown; error?: { message: string } | null } = {}) {
  const rpc = vi.fn().mockResolvedValue({
    data: result.data ?? {
      seller_id: SELLER_ID,
      plan: 'pro',
      subscription_status: 'active',
      subscription_end: '2026-08-01T00:00:00Z',
      previous_subscription_end: null,
      upgrade_request_activated: false,
    },
    error: result.error ?? null,
  })
  serviceMock.createServiceClient.mockReturnValue({ rpc })
  return rpc
}

describe('POST /api/ops/activate-subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejette sans header Authorization', async () => {
    const response = await POST(opsRequest({ seller_id: SELLER_ID, plan: 'pro' }, null))
    expect(response.status).toBe(401)
  })

  it('rejette un mauvais secret', async () => {
    const response = await POST(opsRequest({ seller_id: SELLER_ID, plan: 'pro' }, 'wrong-secret'))
    expect(response.status).toBe(401)
  })

  it('rejette un seller_id non-UUID', async () => {
    mockRpc()
    const response = await POST(opsRequest({ seller_id: 'not-a-uuid', plan: 'pro' }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('UUID') })
  })

  it('rejette le plan business (non disponible)', async () => {
    mockRpc()
    const response = await POST(opsRequest({ seller_id: SELLER_ID, plan: 'business' }))
    expect(response.status).toBe(400)
  })

  it('rejette months hors bornes', async () => {
    mockRpc()
    const zero = await POST(opsRequest({ seller_id: SELLER_ID, plan: 'pro', months: 0 }))
    expect(zero.status).toBe(400)
    const tooMany = await POST(opsRequest({ seller_id: SELLER_ID, plan: 'pro', months: 25 }))
    expect(tooMany.status).toBe(400)
  })

  it('active un abonnement pro : RPC appelée avec 30 jours par mois', async () => {
    const rpc = mockRpc()
    const response = await POST(opsRequest({ seller_id: SELLER_ID, plan: 'pro', months: 2 }))

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('activate_paid_subscription', expect.objectContaining({
      p_seller_id: SELLER_ID,
      p_plan: 'pro',
      p_duration_days: 60,
    }))
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      seller_id: SELLER_ID,
      plan: 'pro',
    })
  })

  it('months par défaut = 1 (30 jours)', async () => {
    const rpc = mockRpc()
    await POST(opsRequest({ seller_id: SELLER_ID, plan: 'starter' }))
    expect(rpc).toHaveBeenCalledWith('activate_paid_subscription', expect.objectContaining({
      p_duration_days: 30,
    }))
  })

  it('remonte les erreurs RPC en 500 avec capture Sentry', async () => {
    mockRpc({ error: { message: 'seller_not_found' } })
    const response = await POST(opsRequest({ seller_id: SELLER_ID, plan: 'pro' }))
    expect(response.status).toBe(500)
    expect(sentryMock.captureException).toHaveBeenCalled()
  })
})
