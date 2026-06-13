/**
 * Integration tests — sanity checks for migration correctness.
 *
 * These tests catch issues that text-based snapshot tests miss:
 *   - C1: Forward-reference ordering (activity_logs depends on team_members functions)
 *   - I1: Double-trigger on customers.order_count
 *
 * Requires a running local Supabase instance:
 *   npx supabase start   (from the repo root)
 *
 * Set .env.test.local:
 *   SUPABASE_TEST_URL=http://localhost:54321
 *   SUPABASE_TEST_ANON_KEY=<anon key>
 *   SUPABASE_TEST_SERVICE_KEY=<service_role key>
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  hasIntegrationEnv,
  adminClient,
  authenticateAs,
  createTestSeller,
  cleanupSeller,
} from './setup'

const describeIf = hasIntegrationEnv ? describe : describe.skip

// ─────────────────────────────────────────────────────────────
// C1 — get_seller_id / can_write_seller functions exist
// ─────────────────────────────────────────────────────────────
describeIf('Migration ordering — team_members functions exist (C1)', () => {
  let sellerA: { id: string; email: string }
  let sellerB: { id: string; email: string }

  beforeAll(async () => {
    sellerA = await createTestSeller('migration-order-a')
    sellerB = await createTestSeller('migration-order-b')

    const { error } = await adminClient.from('activity_logs').insert({
      seller_id: sellerA.id,
      user_id: sellerA.id,
      action_type: 'order_created',
      description: 'Migration RLS isolation test',
    })
    if (error) throw new Error(`Activity log setup failed: ${error.message}`)
  })

  afterAll(async () => {
    if (sellerA) await cleanupSeller(sellerA.id)
    if (sellerB) await cleanupSeller(sellerB.id)
  })

  it('get_seller_id() is callable without "does not exist" error', async () => {
    const { error } = await adminClient.rpc('get_seller_id')
    // Service role returns NULL (no session), but the function must exist.
    expect(error).toBeNull()
  })

  it('detects the service role used by integration setup', async () => {
    const { data, error } = await adminClient.rpc('is_service_role')

    expect(error).toBeNull()
    expect(data).toBe(true)
  })

  it('does not treat a normal seller session as service_role', async () => {
    const sellerClient = await authenticateAs(sellerA.email)
    const { data, error } = await sellerClient.rpc('is_service_role')

    expect(error).toBeNull()
    expect(data).toBe(false)
  })

  it('can_write_seller() is callable without "does not exist" error', async () => {
    const { error } = await adminClient.rpc('can_write_seller', {
      p_seller_id: '00000000-0000-0000-0000-000000000000',
    })
    expect(error).toBeNull()
  })

  it('get_team_role() is callable without "does not exist" error', async () => {
    const { error } = await adminClient.rpc('get_team_role', {
      p_seller_id: '00000000-0000-0000-0000-000000000000',
    })
    expect(error).toBeNull()
  })

  it('activity_logs RLS hides another seller activity', async () => {
    const sellerBClient = await authenticateAs(sellerB.email)
    const { data, error } = await sellerBClient
      .from('activity_logs')
      .select('id')
      .eq('seller_id', sellerA.id)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────
// Schema integrity — all required tables exist
// ─────────────────────────────────────────────────────────────
describeIf('Schema integrity — tables existent', () => {
  const requiredTables = [
    'sellers', 'products', 'customers', 'orders',
    'deliveries', 'team_members', 'activity_logs',
    'stock_movements', 'order_status_history',
    'order_status_transitions', 'cod_reversals',
    'rate_limits', 'waitlist', 'contact_messages',
    'upgrade_requests',
  ]

  requiredTables.forEach(table => {
    it(`table ${table} exists`, async () => {
      const { error } = await adminClient.from(table).select('*').limit(0)
      expect(error?.message ?? '').not.toContain('does not exist')
    })
  })
})

// ─────────────────────────────────────────────────────────────
// Schema integrity — critical RPCs are callable
// ─────────────────────────────────────────────────────────────
describeIf('Schema integrity — fonctions existent', () => {
  it('update_order_status() is callable', async () => {
    const { error } = await adminClient.rpc('update_order_status', {
      p_seller_id: '00000000-0000-0000-0000-000000000000',
      p_order_id:  '00000000-0000-0000-0000-000000000000',
      p_new_status: 'new',
      p_changed_by: '00000000-0000-0000-0000-000000000000',
    })
    // Returns an error (order not found / unauthorized) but the function must exist
    expect(error?.message ?? '').not.toContain('does not exist')
  })

  it('get_analytics_summary() is callable', async () => {
    const { error } = await adminClient.rpc('get_analytics_summary', {
      p_seller_id: '00000000-0000-0000-0000-000000000000',
      p_start: new Date().toISOString(),
      p_end:   new Date().toISOString(),
    })
    expect(error?.message ?? '').not.toContain('does not exist')
  })

  it('order_status_transitions has valid state machine data', async () => {
    const { data, error } = await adminClient
      .from('order_status_transitions')
      .select('from_status, to_status')

    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThan(0)

    const transitions = data?.map(t => `${t.from_status}→${t.to_status}`) ?? []

    expect(transitions).toContain('pending→new')
    expect(transitions).toContain('confirmed→shipped')
    expect(transitions).toContain('shipped→delivered')
    // Terminal states must not allow backward transitions
    expect(transitions).not.toContain('delivered→shipped')
    expect(transitions).not.toContain('cancelled→pending')
  })
})

// ─────────────────────────────────────────────────────────────
// I1 — customers.order_count increments by 1, not 2
// ─────────────────────────────────────────────────────────────
describeIf('Migration trigger — order_count increments exactly once (I1)', () => {
  let seller: { id: string; email: string }
  let productId: string
  let customerId: string | null = null

  beforeAll(async () => {
    seller = await createTestSeller('order-count')

    const { data: product, error: productError } = await adminClient
      .from('products')
      .insert({
        seller_id: seller.id,
        name: 'Produit order_count test',
        price: 30,
        cost: 10,
        stock: 50,
      })
      .select('id')
      .single()

    if (productError || !product) {
      throw new Error(`Product setup failed: ${productError?.message}`)
    }
    productId = product.id
  })

  afterAll(async () => {
    if (seller) await cleanupSeller(seller.id)
  })

  it('creates one order and customer order_count equals 1', async () => {
    const { data, error } = await adminClient.rpc('create_order_with_stock', {
      p_seller_id: seller.id,
      p_product_id: productId,
      p_quantity: 1,
      p_customer_name: 'Client order_count',
      p_customer_phone: '55900001',
      p_status: 'pending',
      p_changed_by: seller.id,
    })

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    const orderId = data as string

    const { data: order } = await adminClient
      .from('orders')
      .select('customer_id')
      .eq('id', orderId)
      .single()

    expect(order?.customer_id).toBeTruthy()
    customerId = order?.customer_id ?? null

    const { data: customer } = await adminClient
      .from('customers')
      .select('order_count')
      .eq('id', customerId!)
      .single()

    // If the old trigger (orders_increment_customer_count) is still present,
    // order_count would be 2. After the fix it must be exactly 1.
    expect(customer?.order_count).toBe(1)
  })

  it('second order for the same customer increments order_count to 2', async () => {
    if (!customerId) {
      throw new Error('First order test did not initialize customerId')
    }

    const { error } = await adminClient.rpc('create_order_with_stock', {
      p_seller_id: seller.id,
      p_product_id: productId,
      p_quantity: 1,
      p_customer_name: 'Client order_count',
      p_customer_phone: '55900001',
      p_status: 'pending',
      p_changed_by: seller.id,
    })

    expect(error).toBeNull()

    const { data: customer } = await adminClient
      .from('customers')
      .select('order_count')
      .eq('id', customerId)
      .single()

    expect(customer?.order_count).toBe(2)
  })
})
