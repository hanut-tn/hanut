import { describe, expect, it } from 'vitest'
import type { UserContext } from '@/lib/get-context'
import {
  assertActive,
  requireActive,
  requireActiveResponse,
  SUBSCRIPTION_EXPIRED_MESSAGE,
} from '@/lib/assert-active'

function context(demoExpired: boolean): UserContext {
  return {
    userId: 'user-1',
    sellerId: 'seller-1',
    role: 'admin',
    isSeller: true,
    plan: 'pro',
    demoExpiresAt: demoExpired ? '2026-01-01T00:00:00.000Z' : null,
    demoExpired,
    daysLeft: demoExpired ? 0 : null,
  }
}

describe('active subscription guards', () => {
  it('allows active sellers', () => {
    expect(assertActive(context(false))).toEqual({ ok: true })
    expect(requireActive(context(false))).toBeNull()
    expect(requireActiveResponse(context(false))).toBeNull()
  })

  it('returns a readable server action error for expired sellers', () => {
    expect(assertActive(context(true))).toEqual({
      ok: false,
      error: 'SUBSCRIPTION_EXPIRED',
    })
    expect(requireActive(context(true))).toEqual({
      error: SUBSCRIPTION_EXPIRED_MESSAGE,
    })
  })

  it('returns a structured 403 API response for expired sellers', async () => {
    const response = requireActiveResponse(context(true))

    expect(response?.status).toBe(403)
    await expect(response?.json()).resolves.toEqual({
      error: SUBSCRIPTION_EXPIRED_MESSAGE,
      code: 'SUBSCRIPTION_EXPIRED',
    })
  })
})
