/**
 * E2E integration tests — full order and delivery lifecycle.
 * Uses adminClient (service_role) to exercise RPCs end-to-end.
 * Requires: npx supabase start (from repo root)
 */

import { describe as vitestDescribe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  adminClient,
  createTestSeller,
  cleanupSeller,
  hasIntegrationEnv,
} from './setup'

const describe = hasIntegrationEnv ? vitestDescribe : vitestDescribe.skip

let sellerId: string
let productId: string
const INITIAL_STOCK = 10

async function createOrder(
  name: string,
  phone: string,
  quantity = 1,
  status: 'pending' | 'new' = 'new'
) {
  const { data, error } = await adminClient.rpc('create_order_with_stock', {
    p_seller_id: sellerId,
    p_product_id: productId,
    p_quantity: quantity,
    p_customer_name: name,
    p_customer_phone: phone,
    p_status: status,
    p_changed_by: sellerId,
  })

  expect(error).toBeNull()
  expect(data).toBeTruthy()
  return data as string
}

async function transitionOrder(orderId: string, status: 'new' | 'confirmed') {
  const { error } = await adminClient.rpc('update_order_status', {
    p_seller_id: sellerId,
    p_order_id: orderId,
    p_new_status: status,
    p_changed_by: sellerId,
  })
  expect(error).toBeNull()
}

beforeEach(async () => {
  const seller = await createTestSeller('e2e-lifecycle')
  sellerId = seller.id

  const { data: product, error } = await adminClient.from('products').insert({
    seller_id: sellerId,
    name: 'E2E Lifecycle Product',
    price: 120,
    cost: 50,
    stock: INITIAL_STOCK,
    low_stock_alert: 2,
    variants: [],
  }).select('id').single()
  if (error || !product) throw new Error(`Product setup failed: ${error?.message}`)
  productId = product.id
})

afterEach(async () => {
  await cleanupSeller(sellerId)
})

describe('E2E — Cycle de vie complet d\'une commande', () => {
  it('pending → new → confirmed → shipped → delivered + COD', async () => {
    const orderId = await createOrder('Ahmed Ben Ali', '55123456', 2, 'pending')

    // Stock decremented at creation
    const { data: productAfterCreate } = await adminClient
      .from('products').select('stock').eq('id', productId).single()
    expect(productAfterCreate?.stock).toBe(INITIAL_STOCK - 2)

    // pending → new
    await transitionOrder(orderId, 'new')

    // new → confirmed
    await transitionOrder(orderId, 'confirmed')

    // confirmed → shipped via create_delivery_from_order
    const { data: deliveryId, error: deliveryError } = await adminClient.rpc('create_delivery_from_order', {
      p_seller_id:      sellerId,
      p_user_id:        sellerId,
      p_order_id:       orderId,
      p_carrier:        'intigo',
      p_tracking_number: 'TRK123456',
      p_fee:            8.0,
    })
    expect(deliveryError).toBeNull()
    expect(deliveryId).toBeTruthy()

    const { data: orderAfterDelivery } = await adminClient
      .from('orders').select('status').eq('id', orderId).single()
    expect(orderAfterDelivery?.status).toBe('shipped')

    // shipped → delivered via mark_delivery_cod_collected
    const { error: codError } = await adminClient.rpc('mark_delivery_cod_collected', {
      p_seller_id:   sellerId,
      p_user_id:     sellerId,
      p_delivery_id: deliveryId,
    })
    expect(codError).toBeNull()

    const { data: finalOrder } = await adminClient
      .from('orders').select('status').eq('id', orderId).single()
    expect(finalOrder?.status).toBe('delivered')

    const { data: finalDelivery } = await adminClient
      .from('deliveries').select('cod_collected, delivered_at').eq('id', deliveryId).single()
    expect(finalDelivery?.cod_collected).toBe(true)
    expect(finalDelivery?.delivered_at).not.toBeNull()

    // Full status history: pending, new, confirmed, shipped, delivered
    const { data: history } = await adminClient
      .from('order_status_history')
      .select('status')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: true })
    const statuses = history?.map(h => h.status)
    expect(statuses).toEqual(['pending', 'new', 'confirmed', 'shipped', 'delivered'])
  })

  it('annulation restaure le stock', async () => {
    const { data: productBefore } = await adminClient
      .from('products').select('stock').eq('id', productId).single()
    const stockBefore = productBefore?.stock ?? 0

    const orderId = await createOrder('Test Annulation', '55000099', 3, 'pending')

    // Stock was decremented
    const { data: productDuring } = await adminClient
      .from('products').select('stock').eq('id', productId).single()
    expect(productDuring?.stock).toBe(stockBefore - 3)

    const { error: cancelError } = await adminClient.rpc('cancel_order_with_stock', {
      p_seller_id:  sellerId,
      p_order_id:   orderId,
      p_changed_by: sellerId,
    })
    expect(cancelError).toBeNull()

    // Stock restored to original value
    const { data: productAfter } = await adminClient
      .from('products').select('stock').eq('id', productId).single()
    expect(productAfter?.stock).toBe(stockBefore)

    const { data: order } = await adminClient
      .from('orders').select('status').eq('id', orderId).single()
    expect(order?.status).toBe('cancelled')
  })

  it('COD collecté marque la livraison et passe la commande en livré', async () => {
    const orderId = await createOrder('Test COD', '55000088')
    await transitionOrder(orderId, 'confirmed')

    const { data: deliveryId, error: deliveryError } = await adminClient.rpc('create_delivery_from_order', {
      p_seller_id: sellerId,
      p_user_id:   sellerId,
      p_order_id:  orderId,
      p_carrier:   'navex',
      p_fee:       7.0,
    })
    expect(deliveryError).toBeNull()
    expect(deliveryId).toBeTruthy()

    const { error: codError } = await adminClient.rpc('mark_delivery_cod_collected', {
      p_seller_id:   sellerId,
      p_user_id:     sellerId,
      p_delivery_id: deliveryId,
    })
    expect(codError).toBeNull()

    const { data: delivery } = await adminClient
      .from('deliveries').select('cod_collected, delivered_at').eq('id', deliveryId).single()
    expect(delivery?.cod_collected).toBe(true)
    expect(delivery?.delivered_at).not.toBeNull()

    const { data: order } = await adminClient
      .from('orders').select('status').eq('id', orderId).single()
    expect(order?.status).toBe('delivered')
  })

  it('suppression de livraison puis rollback remet la commande à confirmed', async () => {
    const orderId = await createOrder('Test Delete Delivery', '55000077')
    await transitionOrder(orderId, 'confirmed')

    const { data: deliveryId, error: deliveryError } = await adminClient.rpc('create_delivery_from_order', {
      p_seller_id: sellerId,
      p_user_id:   sellerId,
      p_order_id:  orderId,
      p_carrier:   'adex',
    })
    expect(deliveryError).toBeNull()
    expect(deliveryId).toBeTruthy()

    // Order is now shipped
    const { data: shipped } = await adminClient
      .from('orders').select('status').eq('id', orderId).single()
    expect(shipped?.status).toBe('shipped')

    // Delete the delivery — should rollback order to confirmed
    const { error: deleteError } = await adminClient.from('deliveries').delete().eq('id', deliveryId)
    expect(deleteError).toBeNull()

    const { error: rollbackError } = await adminClient.rpc('update_order_status', {
      p_seller_id:  sellerId,
      p_order_id:   orderId,
      p_new_status: 'confirmed',
      p_changed_by: sellerId,
    })
    expect(rollbackError).toBeNull()

    const { data: rolledBack } = await adminClient
      .from('orders').select('status').eq('id', orderId).single()
    expect(rolledBack?.status).toBe('confirmed')

    const { data: history } = await adminClient
      .from('order_status_history')
      .select('status')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: false })
      .limit(1)
      .single()
    expect(history?.status).toBe('confirmed')
  })
})
