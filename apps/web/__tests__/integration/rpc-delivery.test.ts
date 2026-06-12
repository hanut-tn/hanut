/**
 * Integration tests for delivery RPCs.
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
let orderId: string

beforeEach(async () => {
  const seller = await createTestSeller('delivery-rpc')
  sellerId = seller.id
  sellerEmail = seller.email

  const { data: product } = await adminClient.from('products').insert({
    seller_id: sellerId,
    name: 'Delivery Test Product',
    price: 80,
    cost: 30,
    stock: 5,
    low_stock_alert: 1,
    variants: [],
  }).select('id').single()
  productId = product!.id

  const client = await authenticateAs(sellerEmail)
  const { data: oid, error: createError } = await client.rpc('create_order_with_stock', {
    p_seller_id: sellerId, p_product_id: productId, p_quantity: 1,
    p_customer_name: 'Delivery Customer', p_customer_phone: '21698765432',
    p_status: 'new',
  })
  if (createError || !oid) throw new Error(`Order setup failed: ${createError?.message}`)

  const { error: confirmError } = await client.rpc('update_order_status', {
    p_seller_id: sellerId,
    p_order_id: oid,
    p_new_status: 'confirmed',
    p_changed_by: sellerId,
  })
  if (confirmError) throw new Error(`Order confirmation failed: ${confirmError.message}`)

  orderId = oid as string
})

afterEach(async () => {
  await cleanupSeller(sellerId)
})

describe('create_delivery_from_order', () => {
  it('creates delivery and transitions order to shipped', async () => {
    const client = await authenticateAs(sellerEmail)

    const { data: deliveryId, error } = await client.rpc('create_delivery_from_order', {
      p_seller_id:      sellerId,
      p_user_id:        sellerId,
      p_order_id:       orderId,
      p_carrier:        'intigo',
      p_tracking_number: 'TRK-001',
      p_fee:            7,
    })

    expect(error).toBeNull()
    expect(deliveryId).toBeTruthy()

    const { data: order } = await adminClient.from('orders').select('status').eq('id', orderId).single()
    expect(order!.status).toBe('shipped')

    const { data: delivery } = await adminClient.from('deliveries').select('carrier, cod_collected').eq('id', deliveryId).single()
    expect(delivery!.carrier).toBe('intigo')
    expect(delivery!.cod_collected).toBe(false)

    const { data: history } = await adminClient
      .from('order_status_history')
      .select('status')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: false })
      .limit(1)
      .single()
    expect(history!.status).toBe('shipped')
  })

  it('rejects shipping a non-confirmed order', async () => {
    const client = await authenticateAs(sellerEmail)

    // Change to 'new' so it is no longer shippable
    await adminClient.from('orders').update({ status: 'new' }).eq('id', orderId)

    const { error } = await client.rpc('create_delivery_from_order', {
      p_seller_id: sellerId, p_user_id: sellerId,
      p_order_id: orderId, p_carrier: 'intigo',
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('order_not_shippable')
  })
})

describe('mark_delivery_cod_collected', () => {
  it('marks COD collected and transitions order to delivered atomically', async () => {
    const client = await authenticateAs(sellerEmail)

    const { data: deliveryId } = await client.rpc('create_delivery_from_order', {
      p_seller_id: sellerId, p_user_id: sellerId,
      p_order_id: orderId, p_carrier: 'navex',
    })

    const { error } = await client.rpc('mark_delivery_cod_collected', {
      p_seller_id:   sellerId,
      p_user_id:     sellerId,
      p_delivery_id: deliveryId,
    })
    expect(error).toBeNull()

    const { data: delivery } = await adminClient.from('deliveries').select('cod_collected, delivered_at').eq('id', deliveryId).single()
    expect(delivery!.cod_collected).toBe(true)
    expect(delivery!.delivered_at).not.toBeNull()

    const { data: order } = await adminClient.from('orders').select('status').eq('id', orderId).single()
    expect(order!.status).toBe('delivered')
  })
})

describe('unique active delivery constraint', () => {
  it('blocks creating two active deliveries for the same order', async () => {
    const client = await authenticateAs(sellerEmail)

    const { error: first } = await client.rpc('create_delivery_from_order', {
      p_seller_id: sellerId, p_user_id: sellerId,
      p_order_id: orderId, p_carrier: 'intigo',
    })
    expect(first).toBeNull()

    // Reset order status to confirmed so the RPC check passes,
    // but the DB unique constraint should still fire
    await adminClient.from('orders').update({ status: 'confirmed' }).eq('id', orderId)

    const { error: second } = await client.rpc('create_delivery_from_order', {
      p_seller_id: sellerId, p_user_id: sellerId,
      p_order_id: orderId, p_carrier: 'navex',
    })
    expect(second).not.toBeNull()
  })
})
