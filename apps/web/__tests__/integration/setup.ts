/**
 * Integration test setup.
 * Requires a running local Supabase instance:
 *   npx supabase start   (from the repo root)
 *
 * After `supabase start`, copy the printed anon/service keys into .env.test.local:
 *   SUPABASE_TEST_URL=http://localhost:54321
 *   SUPABASE_TEST_ANON_KEY=<anon key from supabase start output>
 *   SUPABASE_TEST_SERVICE_KEY=<service_role key from supabase start output>
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll } from 'vitest'

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? 'http://localhost:54321'
const ANON_KEY     = process.env.SUPABASE_TEST_ANON_KEY ?? ''
const SERVICE_KEY  = process.env.SUPABASE_TEST_SERVICE_KEY ?? ''

export const hasIntegrationEnv = Boolean(ANON_KEY && SERVICE_KEY)

if (!hasIntegrationEnv) {
  console.warn(
    '[integration] SUPABASE_TEST_ANON_KEY or SUPABASE_TEST_SERVICE_KEY missing. ' +
    'Integration tests will be skipped.'
  )
}

export const anonClient  = createClient(SUPABASE_URL, ANON_KEY || 'missing-anon-key')
export const adminClient = createClient(SUPABASE_URL, SERVICE_KEY || 'missing-service-key', {
  auth: { autoRefreshToken: false, persistSession: false },
})

type TestSeller = { id: string; email: string }

export async function createTestSeller(suffix = ''): Promise<TestSeller> {
  const email = `test-seller-${suffix}-${Date.now()}@hanut-test.local`

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: 'Test1234!',
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`createTestSeller failed: ${error?.message}`)

  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const { error: sellerError } = await adminClient.from('sellers').insert({
    id: data.user.id,
    email,
    name: `Test Seller ${suffix}`,
    plan: 'pro',
    subscription_end: trialEnd,
    slug: `test-${suffix}-${Date.now()}`,
  })
  if (sellerError) throw new Error(`createTestSeller insert failed: ${sellerError.message}`)

  return { id: data.user.id, email }
}

export async function authenticateAs(email: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, ANON_KEY)
  const { error } = await client.auth.signInWithPassword({ email, password: 'Test1234!' })
  if (error) throw new Error(`authenticateAs failed: ${error.message}`)
  return client
}

export async function cleanupSeller(sellerId: string): Promise<void> {
  // Delete in dependency order (FK constraints)
  await adminClient.from('stock_movements').delete().eq('seller_id', sellerId)
  await adminClient.from('activity_logs').delete().eq('seller_id', sellerId)

  // Filtered by order_id IN orders of seller — Supabase JS has no subquery delete helper.
  const { data: orders } = await adminClient.from('orders').select('id').eq('seller_id', sellerId)
  if (orders?.length) {
    const ids = orders.map(o => o.id)
    await adminClient.from('order_status_history').delete().in('order_id', ids)
    await adminClient.from('deliveries').delete().in('order_id', ids)
  }
  await adminClient.from('orders').delete().eq('seller_id', sellerId)
  await adminClient.from('customers').delete().eq('seller_id', sellerId)
  await adminClient.from('products').delete().eq('seller_id', sellerId)
  await adminClient.from('team_members').delete().eq('seller_id', sellerId)
  await adminClient.from('sellers').delete().eq('id', sellerId)
  await adminClient.auth.admin.deleteUser(sellerId).catch(() => {})
}

// Registered sellers cleaned up in tests that use afterEach/afterAll.
const _sellersToCleanup: string[] = []
export function registerForCleanup(sellerId: string) {
  _sellersToCleanup.push(sellerId)
}

afterAll(async () => {
  for (const id of _sellersToCleanup) {
    await cleanupSeller(id).catch(console.error)
  }
})
