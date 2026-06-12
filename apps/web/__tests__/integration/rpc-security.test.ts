/**
 * Integration tests — RPC security guards and status transitions.
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
  createTestSeller,
  authenticateAs,
  cleanupSeller,
} from './setup'

const describeIf = hasIntegrationEnv ? describe : describe.skip

describeIf('RPC Security — can_write_seller guard', () => {
  let sellerA: { id: string; email: string }
  let sellerB: { id: string; email: string }
  let productAId: string

  beforeAll(async () => {
    sellerA = await createTestSeller('security-a')
    sellerB = await createTestSeller('security-b')

    const { data, error } = await adminClient.from('products').insert({
      seller_id: sellerA.id,
      name: 'Produit Sécurité A',
      price: 50,
      cost: 20,
      stock: 100,
    }).select('id').single()

    if (error || !data) throw new Error(`Product setup failed: ${error?.message}`)
    productAId = data.id
  })

  afterAll(async () => {
    if (sellerA) await cleanupSeller(sellerA.id)
    if (sellerB) await cleanupSeller(sellerB.id)
  })

  it('create_order_with_stock rejects seller B targeting seller A', async () => {
    const clientB = await authenticateAs(sellerB.email)

    const { error } = await clientB.rpc('create_order_with_stock', {
      p_seller_id:    sellerA.id,
      p_product_id:   productAId,
      p_quantity:     1,
      p_customer_name:  'Test Client',
      p_customer_phone: '55123456',
      p_status:       'new',
    })

    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/UNAUTHORIZED/i)
  })

  it('create_order_with_stock rejects status other than pending/new', async () => {
    const clientA = await authenticateAs(sellerA.email)

    const { error } = await clientA.rpc('create_order_with_stock', {
      p_seller_id:    sellerA.id,
      p_product_id:   productAId,
      p_quantity:     1,
      p_customer_name:  'Test Client',
      p_customer_phone: '55123457',
      p_status:       'shipped',
    })

    expect(error).not.toBeNull()
    expect(error?.message).toContain('INVALID_STATUS_ON_CREATE')
  })

  it('create_order_with_stock accepts status new for authenticated seller', async () => {
    const clientA = await authenticateAs(sellerA.email)

    const { error } = await clientA.rpc('create_order_with_stock', {
      p_seller_id:    sellerA.id,
      p_product_id:   productAId,
      p_quantity:     1,
      p_customer_name:  'Test Client',
      p_customer_phone: '55123458',
      p_status:       'new',
    })

    expect(error).toBeNull()
  })
})

describeIf('RPC Security — update_order_status transitions', () => {
  let seller: { id: string; email: string }
  let productId: string
  let orderId: string

  beforeAll(async () => {
    seller = await createTestSeller('transitions')

    const { data: product, error: productError } = await adminClient.from('products').insert({
      seller_id: seller.id,
      name: 'Produit Transitions',
      price: 30,
      cost: 10,
      stock: 50,
    }).select('id').single()

    if (productError || !product) {
      throw new Error(`Product setup failed: ${productError?.message}`)
    }
    productId = product.id

    const { data, error } = await adminClient.rpc('create_order_with_stock', {
      p_seller_id:    seller.id,
      p_product_id:   productId,
      p_quantity:     1,
      p_customer_name:  'Client Transitions',
      p_customer_phone: '55987654',
      p_status:       'pending',
      p_changed_by:   seller.id,
    })

    if (error || !data) throw new Error(`Order setup failed: ${error?.message}`)
    orderId = data as string
  })

  afterAll(async () => {
    if (seller) await cleanupSeller(seller.id)
  })

  it('rejects invalid transition: pending → delivered', async () => {
    const { error } = await adminClient.rpc('update_order_status', {
      p_seller_id:  seller.id,
      p_order_id:   orderId,
      p_new_status: 'delivered',
      p_changed_by: seller.id,
    })

    expect(error).not.toBeNull()
    expect(error?.message).toContain('INVALID_TRANSITION')
  })

  it('rejects invalid transition: pending → shipped', async () => {
    const { error } = await adminClient.rpc('update_order_status', {
      p_seller_id:  seller.id,
      p_order_id:   orderId,
      p_new_status: 'shipped',
      p_changed_by: seller.id,
    })

    expect(error).not.toBeNull()
    expect(error?.message).toContain('INVALID_TRANSITION')
  })

  it('accepts valid transition: pending → new', async () => {
    const { error } = await adminClient.rpc('update_order_status', {
      p_seller_id:  seller.id,
      p_order_id:   orderId,
      p_new_status: 'new',
      p_changed_by: seller.id,
    })

    expect(error).toBeNull()
  })

  it('accepts chain: new → confirmed → shipped → delivered', async () => {
    for (const status of ['confirmed', 'shipped', 'delivered'] as const) {
      const { error } = await adminClient.rpc('update_order_status', {
        p_seller_id:  seller.id,
        p_order_id:   orderId,
        p_new_status: status,
        p_changed_by: seller.id,
      })
      expect(error).toBeNull()
    }
  })

  it('rejects transition from terminal status: delivered → new', async () => {
    const { error } = await adminClient.rpc('update_order_status', {
      p_seller_id:  seller.id,
      p_order_id:   orderId,
      p_new_status: 'new',
      p_changed_by: seller.id,
    })

    expect(error).not.toBeNull()
    expect(error?.message).toContain('INVALID_TRANSITION')
  })
})

describeIf('RLS — isolation multi-tenant', () => {
  let sellerA: { id: string; email: string }
  let sellerB: { id: string; email: string }
  let productAId: string
  let orderAId: string

  beforeAll(async () => {
    sellerA = await createTestSeller('security-rls-a')
    sellerB = await createTestSeller('security-rls-b')

    const { data: product, error: productError } = await adminClient.from('products').insert({
      seller_id: sellerA.id,
      name: 'Produit RLS A',
      price: 40,
      stock: 30,
    }).select('id').single()

    if (productError || !product) {
      throw new Error(`Product setup failed: ${productError?.message}`)
    }
    productAId = product.id

    const { data, error } = await adminClient.rpc('create_order_with_stock', {
      p_seller_id:    sellerA.id,
      p_product_id:   productAId,
      p_quantity:     1,
      p_customer_name:  'Client A',
      p_customer_phone: '55111111',
      p_status:       'new',
      p_changed_by:   sellerA.id,
    })

    if (error || !data) throw new Error(`Order setup failed: ${error?.message}`)
    orderAId = data as string
  })

  afterAll(async () => {
    if (sellerA) await cleanupSeller(sellerA.id)
    if (sellerB) await cleanupSeller(sellerB.id)
  })

  it('seller B cannot see orders of seller A via RLS', async () => {
    const clientB = await authenticateAs(sellerB.email)

    const { data } = await clientB
      .from('orders')
      .select('id')
      .eq('seller_id', sellerA.id)

    expect(data).toHaveLength(0)
  })

  it('seller B cannot see products of seller A via RLS', async () => {
    const clientB = await authenticateAs(sellerB.email)

    const { data } = await clientB
      .from('products')
      .select('id')
      .eq('seller_id', sellerA.id)

    expect(data).toHaveLength(0)
  })

  it('seller B cannot update_order_status on seller A orders', async () => {
    const clientB = await authenticateAs(sellerB.email)

    const { error } = await clientB.rpc('update_order_status', {
      p_seller_id:  sellerA.id,
      p_order_id:   orderAId,
      p_new_status: 'confirmed',
      p_changed_by: sellerB.id,
    })

    expect(error).not.toBeNull()
  })

  it('seller A can see their own orders', async () => {
    const clientA = await authenticateAs(sellerA.email)

    const { data } = await clientA
      .from('orders')
      .select('id')
      .eq('seller_id', sellerA.id)

    expect((data ?? []).length).toBeGreaterThan(0)
  })
})
