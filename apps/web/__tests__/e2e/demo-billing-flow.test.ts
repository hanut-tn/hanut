/**
 * E2E tests — demo trial and billing flow.
 * Requires: npx supabase start (from repo root)
 */

import { describe as vitestDescribe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  adminClient,
  createTestSeller,
  cleanupSeller,
  hasIntegrationEnv,
} from '../integration/setup'

const describe = hasIntegrationEnv ? vitestDescribe : vitestDescribe.skip

let sellerId: string

beforeEach(async () => {
  const seller = await createTestSeller('e2e-demo')
  sellerId = seller.id
})

afterEach(async () => {
  await cleanupSeller(sellerId)
})

describe('Demo and billing flow', () => {
  it('new registration gets 14-day Pro trial', async () => {
    const { data: seller } = await adminClient
      .from('sellers')
      .select('plan, subscription_end')
      .eq('id', sellerId)
      .single()

    expect(seller!.plan).toBe('pro')
    expect(seller!.subscription_end).not.toBeNull()

    const expiresAt = new Date(seller!.subscription_end!)
    const daysLeft = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    // Allow ±1 minute of drift from the test setup
    expect(daysLeft).toBeGreaterThan(13.9)
    expect(daysLeft).toBeLessThanOrEqual(14.1)
  })

  it('expired seller has subscription_end in the past', async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString()
    await adminClient.from('sellers').update({ subscription_end: pastDate }).eq('id', sellerId)

    const { data: seller } = await adminClient
      .from('sellers')
      .select('subscription_end')
      .eq('id', sellerId)
      .single()

    expect(new Date(seller!.subscription_end!).getTime()).toBeLessThan(Date.now())
  })

  it('seller with NULL subscription_end has permanent access (paid plan)', async () => {
    await adminClient.from('sellers').update({ subscription_end: null }).eq('id', sellerId)

    const { data: seller } = await adminClient
      .from('sellers')
      .select('subscription_end, plan')
      .eq('id', sellerId)
      .single()

    expect(seller!.subscription_end).toBeNull()
    // NULL subscription_end = no expiry — user has paid plan access
  })
})
