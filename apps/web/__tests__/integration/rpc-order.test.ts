/**
 * Integration tests for order RPCs.
 * Requires: npx supabase start (from repo root)
 */

import { describe as vitestDescribe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  adminClient,
  createTestSeller,
  authenticateAs,
  cleanupSeller,
  hasIntegrationEnv,
} from './setup'

const describe = hasIntegrationEnv ? vitestDescribe : vitestDescribe.skip

let sellerId: string
let sellerEmail: string
let productId: string

beforeEach(async () => {
  const seller = await createTestSeller('order-rpc')
  sellerId = seller.id
  sellerEmail = seller.email

  const { data: product } = await adminClient.from('products').insert({
    seller_id: sellerId,
    name: 'Test Product',
    price: 50,
    cost: 20,
    stock: 10,
    low_stock_alert: 2,
    variants: [],
  }).select('id').single()
  productId = product!.id

  await adminClient.from('customers').insert({
    seller_id: sellerId,
    name: 'Test Customer',
    phone: '21612345678',
  })
})

afterEach(async () => {
  await cleanupSeller(sellerId)
})

describe('create_order_with_stock', () => {
  it('creates order and decrements stock atomically', async () => {
    const client = await authenticateAs(sellerEmail)

    const { data: orderId, error } = await client.rpc('create_order_with_stock', {
      p_seller_id:      sellerId,
      p_product_id:     productId,
      p_quantity:       3,
      p_customer_name:  'Test Customer',
      p_customer_phone: '21612345678',
      p_status:         'new',
    })

    expect(error).toBeNull()
    expect(orderId).toBeTruthy()

    const { data: product } = await adminClient.from('products').select('stock').eq('id', productId).single()
    expect(product!.stock).toBe(7)

    const { data: order } = await adminClient.from('orders').select('status, tracking_token').eq('id', orderId).single()
    expect(order!.status).toBe('new')
    expect(order!.tracking_token).toBeTruthy()
    expect(order!.tracking_token).toHaveLength(32)
  })

  it('rejects insufficient stock without modifying anything', async () => {
    const client = await authenticateAs(sellerEmail)

    const { data: orderId, error } = await client.rpc('create_order_with_stock', {
      p_seller_id:      sellerId,
      p_product_id:     productId,
      p_quantity:       99,
      p_customer_name:  'Test Customer',
      p_customer_phone: '21612345678',
      p_status:         'new',
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('Stock insuffisant')
    expect(orderId).toBeNull()

    // Stock must not have changed
    const { data: product } = await adminClient.from('products').select('stock').eq('id', productId).single()
    expect(product!.stock).toBe(10)
  })

  it('prevents overselling under concurrent load', async () => {
    // Set stock to 1 so only one of two concurrent orders can succeed
    await adminClient.from('products').update({ stock: 1 }).eq('id', productId)

    const client = await authenticateAs(sellerEmail)

    const [result1, result2] = await Promise.all([
      client.rpc('create_order_with_stock', {
        p_seller_id: sellerId, p_product_id: productId, p_quantity: 1,
        p_customer_name: 'A', p_customer_phone: '21611111111', p_status: 'new',
      }),
      client.rpc('create_order_with_stock', {
        p_seller_id: sellerId, p_product_id: productId, p_quantity: 1,
        p_customer_name: 'B', p_customer_phone: '21622222222', p_status: 'new',
      }),
    ])

    const successes = [result1, result2].filter(r => r.error === null).length
    const failures  = [result1, result2].filter(r => r.error !== null).length
    expect(successes).toBe(1)
    expect(failures).toBe(1)

    const { data: product } = await adminClient.from('products').select('stock').eq('id', productId).single()
    expect(product!.stock).toBe(0)
  })

  it('restores stock when soft-deleting an active order', async () => {
    const client = await authenticateAs(sellerEmail)

    const { data: orderId } = await client.rpc('create_order_with_stock', {
      p_seller_id: sellerId, p_product_id: productId, p_quantity: 3,
      p_customer_name: 'Test Customer', p_customer_phone: '21612345678', p_status: 'new',
    })
    expect(orderId).toBeTruthy()

    const { error: deleteError } = await client.rpc('soft_delete_order_with_stock', {
      p_seller_id: sellerId,
      p_order_id: orderId,
    })
    expect(deleteError).toBeNull()

    const { data: product } = await adminClient.from('products').select('stock').eq('id', productId).single()
    expect(product!.stock).toBe(10)

    const { data: order } = await adminClient.from('orders').select('deleted_at').eq('id', orderId).single()
    expect(order!.deleted_at).not.toBeNull()
  })
})

describe('update_order_status', () => {
  it('writes an entry to order_status_history', async () => {
    const client = await authenticateAs(sellerEmail)

    const { data: orderId } = await client.rpc('create_order_with_stock', {
      p_seller_id: sellerId, p_product_id: productId, p_quantity: 1,
      p_customer_name: 'Test Customer', p_customer_phone: '21612345678', p_status: 'new',
    })

    const { error } = await client.rpc('update_order_status', {
      p_seller_id:  sellerId,
      p_order_id:   orderId,
      p_new_status: 'confirmed',
      p_changed_by: sellerId,
    })
    expect(error).toBeNull()

    const { data: history } = await adminClient
      .from('order_status_history')
      .select('status')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: false })
      .limit(1)
      .single()

    expect(history!.status).toBe('confirmed')
  })
})
