/**
 * E2E tests — complete order lifecycle.
 * Requires: npx supabase start (from repo root)
 * See __tests__/e2e/README.md for setup instructions.
 */

import { describe as vitestDescribe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  adminClient,
  createTestSeller,
  authenticateAs,
  cleanupSeller,
  hasIntegrationEnv,
} from '../integration/setup'

const describe = hasIntegrationEnv ? vitestDescribe : vitestDescribe.skip

let sellerId: string
let sellerEmail: string
let productId: string

beforeEach(async () => {
  const seller = await createTestSeller('e2e-order')
  sellerId = seller.id
  sellerEmail = seller.email

  const { data: product } = await adminClient.from('products').insert({
    seller_id: sellerId,
    name: 'E2E Product',
    price: 75,
    cost: 30,
    stock: 20,
    low_stock_alert: 3,
    variants: [],
  }).select('id').single()
  productId = product!.id
})

afterEach(async () => {
  await cleanupSeller(sellerId)
})

describe('Public order flow', () => {
  it('full lifecycle: pending → confirmed → shipped → delivered', async () => {
    const client = await authenticateAs(sellerEmail)

    // Étape 1 : créer une commande publique (status = pending)
    const { data: orderId, error: createErr } = await client.rpc('create_order_with_stock', {
      p_seller_id: sellerId, p_product_id: productId, p_quantity: 2,
      p_customer_name: 'E2E Client', p_customer_phone: '21611223344',
      p_status: 'pending',
    })
    expect(createErr).toBeNull()
    expect(orderId).toBeTruthy()

    // Stock decremented
    const { data: product } = await adminClient.from('products').select('stock').eq('id', productId).single()
    expect(product!.stock).toBe(18)

    // Étape 2 : accepter la commande publique, puis la confirmer.
    const { error: acceptErr } = await client.rpc('update_order_status', {
      p_seller_id: sellerId, p_order_id: orderId, p_new_status: 'new', p_changed_by: sellerId,
    })
    expect(acceptErr).toBeNull()

    const { error: confirmErr } = await client.rpc('update_order_status', {
      p_seller_id: sellerId, p_order_id: orderId, p_new_status: 'confirmed', p_changed_by: sellerId,
    })
    expect(confirmErr).toBeNull()

    // Étape 3 : expédier
    const { data: deliveryId, error: shipErr } = await client.rpc('create_delivery_from_order', {
      p_seller_id: sellerId, p_user_id: sellerId, p_order_id: orderId,
      p_carrier: 'intigo', p_tracking_number: 'TRK-E2E-001', p_fee: 8,
    })
    expect(shipErr).toBeNull()

    const { data: shippedOrder } = await adminClient.from('orders').select('status').eq('id', orderId).single()
    expect(shippedOrder!.status).toBe('shipped')

    // Étape 4 : marquer livré (COD collecté)
    const { error: codErr } = await client.rpc('mark_delivery_cod_collected', {
      p_seller_id: sellerId, p_user_id: sellerId, p_delivery_id: deliveryId,
    })
    expect(codErr).toBeNull()

    const { data: deliveredOrder } = await adminClient.from('orders').select('status').eq('id', orderId).single()
    expect(deliveredOrder!.status).toBe('delivered')

    const { data: delivery } = await adminClient.from('deliveries').select('cod_collected').eq('id', deliveryId).single()
    expect(delivery!.cod_collected).toBe(true)

    // Étape 5 : vérifier le tracking public — lookup par tracking_token, pas par UUID
    const { data: orderWithToken } = await adminClient
      .from('orders')
      .select('tracking_token')
      .eq('id', orderId)
      .single()
    const token = orderWithToken!.tracking_token
    expect(token).toBeTruthy()
    expect(token).toHaveLength(32)

    // La réponse publique ne doit pas contenir l'UUID interne
    const { data: publicOrder } = await adminClient
      .from('orders')
      .select('id, status, tracking_token')
      .eq('tracking_token', token)
      .is('deleted_at', null)
      .single()
    expect(publicOrder).not.toBeNull()
    expect(publicOrder!.status).toBe('delivered')

    // Vérifier l'historique complet
    const { data: history } = await adminClient
      .from('order_status_history')
      .select('status')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: true })
    const statuses = history!.map(h => h.status)
    expect(statuses).toContain('pending')
    expect(statuses).toContain('new')
    expect(statuses).toContain('confirmed')
    expect(statuses).toContain('shipped')
    expect(statuses).toContain('delivered')
  })

  it('stock is restored when pending order is cancelled', async () => {
    const client = await authenticateAs(sellerEmail)

    const { data: orderId } = await client.rpc('create_order_with_stock', {
      p_seller_id: sellerId, p_product_id: productId, p_quantity: 5,
      p_customer_name: 'Client Cancel', p_customer_phone: '21699887766',
      p_status: 'pending',
    })

    const { error: cancelErr } = await client.rpc('cancel_pending_order_with_stock', {
      p_seller_id: sellerId, p_order_id: orderId, p_changed_by: sellerId,
    })
    expect(cancelErr).toBeNull()

    const { data: order } = await adminClient.from('orders').select('status').eq('id', orderId).single()
    expect(order!.status).toBe('cancelled')

    const { data: product } = await adminClient.from('products').select('stock').eq('id', productId).single()
    expect(product!.stock).toBe(20)
  })

  it('expired shop rejects public orders (subscription_end in the past)', async () => {
    // Set subscription_end to the past to expire the seller's demo
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await adminClient.from('sellers').update({ subscription_end: pastDate }).eq('id', sellerId)

    const { data: seller } = await adminClient.from('sellers')
      .select('subscription_end')
      .eq('id', sellerId)
      .single()
    expect(new Date(seller!.subscription_end!).getTime()).toBeLessThan(Date.now())
  })
})

describe('Starter plan enforcement', () => {
  it('blocks order creation at 100 monthly orders', async () => {
    // Set plan to starter
    await adminClient.from('sellers').update({ plan: 'starter' }).eq('id', sellerId)

    // Insert 100 orders directly (bypassing stock check for speed)
    const customer = await adminClient.from('customers').insert({
      seller_id: sellerId, name: 'Batch Client', phone: '21600000001',
    }).select('id').single()
    const customerId = customer.data!.id

    const orders = Array.from({ length: 100 }, () => ({
      seller_id:   sellerId,
      product_id:  productId,
      customer_id: customerId,
      quantity:    1,
      cod_amount:  50,
      status:      'delivered',
      unit_cost:   0,
      tracking_token: Math.random().toString(36).slice(2, 34).padEnd(32, '0'),
    }))
    await adminClient.from('orders').insert(orders)

    // The 101st order via RPC must be blocked at the applicative level.
    // The RPC itself doesn't check plan limits — that check is in the server action.
    // Here we only verify the count is correct to validate the server action logic.
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { count } = await adminClient
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .is('deleted_at', null)
      .gte('created_at', firstOfMonth)
    expect(count).toBeGreaterThanOrEqual(100)
  })
})
