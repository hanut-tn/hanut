/**
 * G4 — Integration tests for RPCs not covered elsewhere.
 * Requires a running local Supabase instance: npx supabase start
 *
 * anonymize_customer: verifies structured address columns (v2) are cleared
 * create_order_with_items: stock decrement, order_items insert, quota
 * check_rate_limit: sliding window behavior
 * activate_paid_subscription / renew_paid_subscription: subscription lifecycle
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  hasIntegrationEnv,
  adminClient,
  createTestSeller,
  authenticateAs,
  cleanupSeller,
} from './setup'

const describeIf = hasIntegrationEnv ? describe : describe.skip

// ── anonymize_customer: structured address columns ────────────────────────────

describeIf('anonymize_customer — structured address columns (v2)', () => {
  let seller: { id: string; email: string }
  let productId: string
  let customerId: string
  let orderId: string

  beforeAll(async () => {
    seller = await createTestSeller('anon-v2')

    const { data: product, error: productErr } = await adminClient
      .from('products')
      .insert({ seller_id: seller.id, name: 'Produit Anon V2', price: 50, cost: 20, stock: 10 })
      .select('id')
      .single()
    if (productErr || !product) throw new Error(`Product setup: ${productErr?.message}`)
    productId = product.id

    const ownerClient = await authenticateAs(seller.email)
    const { data: newOrderId, error: orderErr } = await ownerClient.rpc(
      'create_order_with_items',
      {
        p_seller_id: seller.id,
        p_customer_name: 'Client V2',
        p_customer_phone: '55112233',
        p_customer_address: '12 rue du Test',
        p_customer_city: 'Tunis',
        p_customer_governorate: 'Tunis',
        p_customer_delegation: 'Bab Bhar',
        p_customer_landmark: 'Près de la poste',
        p_customer_postal_code: '1000',
        p_delivery_notes: 'Sonner 2 fois',
        p_status: 'new',
        p_items: JSON.stringify([{ product_id: productId, quantity: 1 }]),
      },
    )
    if (orderErr || !newOrderId) throw new Error(`Order setup: ${orderErr?.message}`)
    orderId = newOrderId as string

    const { data: order } = await adminClient
      .from('orders')
      .select('customer_id')
      .eq('id', orderId)
      .single()
    if (!order?.customer_id) throw new Error('customer_id lookup failed')
    customerId = order.customer_id
  })

  afterAll(async () => {
    if (seller) await cleanupSeller(seller.id)
  })

  it('clears all structured address fields on orders and customers', async () => {
    const ownerClient = await authenticateAs(seller.email)
    const { error } = await ownerClient.rpc('anonymize_customer', {
      p_seller_id: seller.id,
      p_customer_id: customerId,
    })
    expect(error).toBeNull()

    const [{ data: customer }, { data: order }] = await Promise.all([
      adminClient
        .from('customers')
        .select(
          'name,phone,email,address,city,customer_governorate,customer_city,customer_delegation,' +
          'customer_address,customer_landmark,customer_postal_code,delivery_notes,address_version',
        )
        .eq('id', customerId)
        .single(),
      adminClient
        .from('orders')
        .select(
          'customer_email,customer_address,customer_city,customer_governorate,' +
          'customer_delegation,customer_landmark,customer_postal_code,delivery_notes,address_version',
        )
        .eq('id', orderId)
        .single(),
    ])

    expect(customer).toMatchObject({
      name: 'Client anonymisé',
      phone: '00000000',
      email: null,
      address: null,
      city: null,
      customer_governorate: null,
      customer_city: null,
      customer_delegation: null,
      customer_address: null,
      customer_landmark: null,
      customer_postal_code: null,
      delivery_notes: null,
      address_version: 1,
    })
    expect(order).toMatchObject({
      customer_email: null,
      customer_address: null,
      customer_city: null,
      customer_governorate: null,
      customer_delegation: null,
      customer_landmark: null,
      customer_postal_code: null,
      delivery_notes: null,
      address_version: 1,
    })
  })
})

// ── create_order_with_items ───────────────────────────────────────────────────

describeIf('create_order_with_items', () => {
  let seller: { id: string; email: string }
  let productA: string
  let productB: string

  beforeAll(async () => {
    seller = await createTestSeller('order-items')

    const { data: a } = await adminClient
      .from('products')
      .insert({ seller_id: seller.id, name: 'Produit A', price: 30, cost: 10, stock: 20 })
      .select('id')
      .single()
    const { data: b } = await adminClient
      .from('products')
      .insert({ seller_id: seller.id, name: 'Produit B', price: 50, cost: 25, stock: 5 })
      .select('id')
      .single()
    if (!a || !b) throw new Error('Product setup failed')
    productA = a.id
    productB = b.id
  })

  afterAll(async () => {
    if (seller) await cleanupSeller(seller.id)
  })

  it('inserts order_items and decrements stock atomically for a multi-item order', async () => {
    const client = await authenticateAs(seller.email)

    const { data: orderId, error } = await client.rpc('create_order_with_items', {
      p_seller_id: seller.id,
      p_customer_name: 'Client Multi',
      p_customer_phone: '22334455',
      p_status: 'new',
      p_items: JSON.stringify([
        { product_id: productA, quantity: 3 },
        { product_id: productB, quantity: 2 },
      ]),
    })

    expect(error).toBeNull()
    expect(orderId).toBeTruthy()

    const [{ data: items }, { data: pA }, { data: pB }] = await Promise.all([
      adminClient.from('order_items').select('product_id,quantity').eq('order_id', orderId as string),
      adminClient.from('products').select('stock').eq('id', productA).single(),
      adminClient.from('products').select('stock').eq('id', productB).single(),
    ])

    expect(items).toHaveLength(2)
    expect(pA!.stock).toBe(17)
    expect(pB!.stock).toBe(3)
  })

  it('rejects an order where one item has insufficient stock', async () => {
    const client = await authenticateAs(seller.email)

    const { data, error } = await client.rpc('create_order_with_items', {
      p_seller_id: seller.id,
      p_customer_name: 'Client Overstock',
      p_customer_phone: '33445566',
      p_status: 'new',
      p_items: JSON.stringify([
        { product_id: productB, quantity: 99 },
      ]),
    })

    expect(error).not.toBeNull()
    expect(data).toBeNull()

    const { data: pB } = await adminClient.from('products').select('stock').eq('id', productB).single()
    expect(pB!.stock).toBe(3)
  })

  it('rejects duplicate product-variant lines before stock can go negative', async () => {
    const { data: variantProduct } = await adminClient
      .from('products')
      .insert({
        seller_id: seller.id,
        name: 'Variant Duplicate Guard',
        price: 20,
        cost: 8,
        stock: 3,
        variants: [{ name: 'Taille M', qty: 3 }],
      })
      .select('id')
      .single()
    if (!variantProduct) throw new Error('Variant product setup failed')

    const client = await authenticateAs(seller.email)
    const { error } = await client.rpc('create_order_with_items', {
      p_seller_id: seller.id,
      p_customer_name: 'Client Duplicate',
      p_customer_phone: '22330011',
      p_status: 'new',
      p_items: JSON.stringify([
        { product_id: variantProduct.id, variant: 'Taille M', quantity: 2 },
        { product_id: variantProduct.id, variant: 'Taille M', quantity: 2 },
      ]),
    })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/DUPLICATE_ORDER_ITEM/i)

    const { data: productAfter } = await adminClient
      .from('products')
      .select('stock, variants')
      .eq('id', variantProduct.id)
      .single()
    expect(productAfter!.stock).toBe(3)
    const variants = productAfter!.variants as Array<{ qty: number | string }>
    expect(Number(variants[0]?.qty)).toBe(3)
  })

  it('rejects quota exceeded for starter plan (100 orders/month)', async () => {
    const starterSeller = await createTestSeller('quota-test')
    try {
      await adminClient.from('sellers').update({ plan: 'starter', subscription_end: new Date(Date.now() + 30 * 86400_000).toISOString() }).eq('id', starterSeller.id)

      const { data: qProduct } = await adminClient
        .from('products')
        .insert({ seller_id: starterSeller.id, name: 'Quota Prod', price: 10, cost: 5, stock: 999 })
        .select('id')
        .single()
      if (!qProduct) throw new Error('Quota product setup failed')

      await adminClient.rpc('create_order_with_items', {
        p_seller_id: starterSeller.id,
        p_customer_name: 'Client Quota',
        p_customer_phone: '99887766',
        p_status: 'new',
        p_items: JSON.stringify([{ product_id: qProduct.id, quantity: 1 }]),
      })

      await adminClient
        .from('orders')
        .update({ created_at: new Date().toISOString() })
        .eq('seller_id', starterSeller.id)

      // Simulate 100 existing orders this month via adminClient
      const bulkOrders = Array.from({ length: 99 }, (_, i) => ({
        seller_id: starterSeller.id,
        product_id: qProduct.id,
        quantity: 1,
        cod_amount: 10,
        status: 'new',
        tracking_token: `token${i}${Date.now()}`.slice(0, 32),
      }))
      await adminClient.from('orders').insert(bulkOrders)

      const starterClient = await authenticateAs(starterSeller.email)
      const { error } = await starterClient.rpc('create_order_with_items', {
        p_seller_id: starterSeller.id,
        p_customer_name: 'Client Over Quota',
        p_customer_phone: '12312312',
        p_status: 'new',
        p_items: JSON.stringify([{ product_id: qProduct.id, quantity: 1 }]),
      })

      expect(error).not.toBeNull()
      expect(error!.message).toMatch(/quota|limit|QUOTA/i)
    } finally {
      await cleanupSeller(starterSeller.id)
    }
  })
})

// ── check_rate_limit ──────────────────────────────────────────────────────────

describeIf('check_rate_limit', () => {
  const testId = `test-rate-limit-${Date.now()}`

  afterAll(async () => {
    await adminClient.from('rate_limits').delete().eq('identifier', testId)
  })

  it('allows requests up to max_requests and blocks beyond', async () => {
    const call = () =>
      adminClient.rpc('check_rate_limit', {
        p_identifier: testId,
        p_endpoint: 'unit_test',
        p_max_requests: 2,
        p_window_seconds: 60,
      })

    const r1 = await call()
    expect(r1.error).toBeNull()
    expect(r1.data?.[0]?.allowed).toBe(true)
    expect(r1.data?.[0]?.remaining).toBe(1)

    const r2 = await call()
    expect(r2.data?.[0]?.allowed).toBe(true)
    expect(r2.data?.[0]?.remaining).toBe(0)

    const r3 = await call()
    expect(r3.data?.[0]?.allowed).toBe(false)
    expect(r3.data?.[0]?.remaining).toBe(0)
  })

  it('resets the window after expiry', async () => {
    const expiredId = `test-rate-limit-expired-${Date.now()}`
    try {
      // Saturate a 1-second window
      await adminClient.rpc('check_rate_limit', {
        p_identifier: expiredId,
        p_endpoint: 'unit_test_reset',
        p_max_requests: 1,
        p_window_seconds: 1,
      })

      // Expire the window by back-dating window_start
      await adminClient
        .from('rate_limits')
        .update({ window_start: new Date(Date.now() - 2000).toISOString() })
        .eq('identifier', expiredId)
        .eq('endpoint', 'unit_test_reset')

      const r = await adminClient.rpc('check_rate_limit', {
        p_identifier: expiredId,
        p_endpoint: 'unit_test_reset',
        p_max_requests: 1,
        p_window_seconds: 1,
      })
      expect(r.data?.[0]?.allowed).toBe(true)
    } finally {
      await adminClient.from('rate_limits').delete().eq('identifier', expiredId)
    }
  })
})

// ── activate_paid_subscription / renew_paid_subscription ─────────────────────

describeIf('activate_paid_subscription + renew_paid_subscription', () => {
  let seller: { id: string; email: string }

  beforeAll(async () => {
    seller = await createTestSeller('sub-lifecycle')
    // Reset to starter with no active subscription
    await adminClient
      .from('sellers')
      .update({ plan: 'starter', subscription_end: null, subscription_status: 'trial' })
      .eq('id', seller.id)
  })

  afterAll(async () => {
    if (seller) await cleanupSeller(seller.id)
  })

  it('activate_paid_subscription is blocked for authenticated users', async () => {
    const ownerClient = await authenticateAs(seller.email)
    const { error } = await ownerClient.rpc('activate_paid_subscription', {
      p_seller_id: seller.id,
      p_plan: 'pro',
      p_duration_days: 30,
    })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/UNAUTHORIZED/i)
  })

  it('activate_paid_subscription sets plan, subscription_end and status=active', async () => {
    const before = new Date()
    const { data, error } = await adminClient.rpc('activate_paid_subscription', {
      p_seller_id: seller.id,
      p_plan: 'pro',
      p_duration_days: 30,
      p_activated_by: 'system-test',
    })
    expect(error).toBeNull()
    expect(data).toBeTruthy()

    const { data: s } = await adminClient
      .from('sellers')
      .select('plan,subscription_status,subscription_end')
      .eq('id', seller.id)
      .single()

    expect(s!.plan).toBe('pro')
    expect(s!.subscription_status).toBe('active')
    const newEnd = new Date(s!.subscription_end)
    expect(newEnd.getTime()).toBeGreaterThan(before.getTime() + 29 * 86400_000)
  })

  it('renew_paid_subscription extends subscription_end from current end (preserves time)', async () => {
    const { data: before } = await adminClient
      .from('sellers')
      .select('subscription_end,plan')
      .eq('id', seller.id)
      .single()

    const prevEnd = new Date(before!.subscription_end)

    const { error } = await adminClient.rpc('renew_paid_subscription', {
      p_seller_id: seller.id,
      p_duration_days: 30,
      p_activated_by: 'system-test',
    })
    expect(error).toBeNull()

    const { data: after } = await adminClient
      .from('sellers')
      .select('subscription_end,plan')
      .eq('id', seller.id)
      .single()

    const newEnd = new Date(after!.subscription_end)
    // New end ≥ prevEnd + ~30 days (allow 5s tolerance)
    expect(newEnd.getTime()).toBeGreaterThanOrEqual(prevEnd.getTime() + 29 * 86400_000 - 5_000)
    // Plan preserved
    expect(after!.plan).toBe(before!.plan)
  })

  it('renew_paid_subscription is blocked for authenticated users', async () => {
    const ownerClient = await authenticateAs(seller.email)
    const { error } = await ownerClient.rpc('renew_paid_subscription', {
      p_seller_id: seller.id,
      p_duration_days: 30,
    })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/UNAUTHORIZED/i)
  })
})
