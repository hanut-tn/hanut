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

type CodSummaryRow = {
  total_collected_amount: unknown
  total_reversed_amount: unknown
  pending_reversal_count: unknown
  pending_reversal_amount: unknown
  total_fees: unknown
}

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

describe('personal delivery lifecycle', () => {
  it('creates, completes and excludes a personal delivery from carrier reversals', async () => {
    const client = await authenticateAs(sellerEmail)

    const { data: deliveryId, error: createError } = await client.rpc('create_delivery_from_order', {
      p_seller_id: sellerId,
      p_user_id: sellerId,
      p_order_id: orderId,
      p_delivery_type: 'self',
      p_vendor_note: 'Livraison demain matin',
    })
    expect(createError).toBeNull()

    const { data: createdDelivery } = await adminClient
      .from('deliveries')
      .select('delivery_type, carrier, tracking_number, fee, vendor_note')
      .eq('id', deliveryId)
      .single()
    expect(createdDelivery).toEqual({
      delivery_type: 'self',
      carrier: null,
      tracking_number: null,
      fee: null,
      vendor_note: 'Livraison demain matin',
    })

    const { error: completeError } = await client.rpc('mark_self_delivery_complete', {
      p_seller_id: sellerId,
      p_user_id: sellerId,
      p_delivery_id: deliveryId,
    })
    expect(completeError).toBeNull()

    const { data: completedDelivery } = await adminClient
      .from('deliveries')
      .select('cod_collected, cod_reversed, delivered_at')
      .eq('id', deliveryId)
      .single()
    expect(completedDelivery?.cod_collected).toBe(true)
    expect(completedDelivery?.cod_reversed).toBe(false)
    expect(completedDelivery?.delivered_at).not.toBeNull()

    const { data: order } = await adminClient
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()
    expect(order?.status).toBe('delivered')

    const { data: summaryData, error: summaryError } = await client
      .rpc('get_cod_summary', { p_seller_id: sellerId })
      .single()
    const summary = summaryData as CodSummaryRow | null
    expect(summaryError).toBeNull()
    expect(Number(summary?.total_collected_amount)).toBe(80)
    expect(Number(summary?.pending_reversal_count)).toBe(0)
    expect(Number(summary?.pending_reversal_amount)).toBe(0)
    expect(Number(summary?.total_reversed_amount)).toBe(0)
  })

  it('rejects completing a carrier delivery through the personal-delivery RPC', async () => {
    const client = await authenticateAs(sellerEmail)

    const { data: deliveryId, error: createError } = await client.rpc('create_delivery_from_order', {
      p_seller_id: sellerId,
      p_user_id: sellerId,
      p_order_id: orderId,
      p_carrier: 'intigo',
    })
    expect(createError).toBeNull()

    const { error } = await client.rpc('mark_self_delivery_complete', {
      p_seller_id: sellerId,
      p_user_id: sellerId,
      p_delivery_id: deliveryId,
    })

    expect(error?.message).toContain('SELF_DELIVERY_NOT_FOUND')
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

describe('mark_delivery_cod_reversed', () => {
  it('records one audited reversal and rejects a duplicate', async () => {
    const client = await authenticateAs(sellerEmail)

    const { data: deliveryId, error: deliveryError } = await client.rpc('create_delivery_from_order', {
      p_seller_id: sellerId,
      p_user_id: sellerId,
      p_order_id: orderId,
      p_carrier: 'navex',
    })
    expect(deliveryError).toBeNull()

    const { error: collectError } = await client.rpc('mark_delivery_cod_collected', {
      p_seller_id: sellerId,
      p_user_id: sellerId,
      p_delivery_id: deliveryId,
    })
    expect(collectError).toBeNull()

    const { data: reversalId, error: reversalError } = await client.rpc('mark_delivery_cod_reversed', {
      p_delivery_id: deliveryId,
      p_seller_id: sellerId,
      p_amount: 80,
      p_notes: 'Virement reçu',
      p_reversed_by: sellerId,
    })
    expect(reversalError).toBeNull()
    expect(reversalId).toBeTruthy()

    const { data: delivery } = await adminClient
      .from('deliveries')
      .select('cod_reversed, cod_reversed_amount, cod_reversed_at, cod_reversed_by')
      .eq('id', deliveryId)
      .single()
    expect(delivery?.cod_reversed).toBe(true)
    expect(delivery?.cod_reversed_amount).toBe(80)
    expect(delivery?.cod_reversed_at).not.toBeNull()
    expect(delivery?.cod_reversed_by).toBe(sellerId)

    const { data: reversal } = await adminClient
      .from('cod_reversals')
      .select('amount, notes, reversed_by')
      .eq('id', reversalId)
      .single()
    expect(reversal).toEqual({
      amount: 80,
      notes: 'Virement reçu',
      reversed_by: sellerId,
    })

    const { error: duplicateError } = await client.rpc('mark_delivery_cod_reversed', {
      p_delivery_id: deliveryId,
      p_seller_id: sellerId,
      p_amount: 80,
      p_reversed_by: sellerId,
    })
    expect(duplicateError?.message).toContain('COD_ALREADY_REVERSED')
  })

  it('rejects reversal when COD has not been collected yet', async () => {
    const client = await authenticateAs(sellerEmail)

    const { data: deliveryId, error: createError } = await client.rpc('create_delivery_from_order', {
      p_seller_id: sellerId,
      p_user_id: sellerId,
      p_order_id: orderId,
      p_carrier: 'navex',
    })
    expect(createError).toBeNull()

    // cod_collected reste false — aucun appel à mark_delivery_cod_collected
    const { error } = await client.rpc('mark_delivery_cod_reversed', {
      p_delivery_id: deliveryId,
      p_seller_id: sellerId,
      p_amount: 80,
    })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('DELIVERY_NOT_FOUND_OR_COD_NOT_COLLECTED')
  })
})

describe('get_cod_summary', () => {
  it('returns exact totals, keeps archived receivables and uses the audited reversal amount', async () => {
    const client = await authenticateAs(sellerEmail)

    const { data: deliveryId, error: deliveryError } = await client.rpc('create_delivery_from_order', {
      p_seller_id: sellerId,
      p_user_id: sellerId,
      p_order_id: orderId,
      p_carrier: 'navex',
      p_fee: 7,
    })
    expect(deliveryError).toBeNull()

    const { error: collectError } = await client.rpc('mark_delivery_cod_collected', {
      p_seller_id: sellerId,
      p_user_id: sellerId,
      p_delivery_id: deliveryId,
    })
    expect(collectError).toBeNull()

    const { data: pendingSummary, error: pendingError } = await client
      .rpc('get_cod_summary', { p_seller_id: sellerId })
      .single()
    const pending = pendingSummary as CodSummaryRow | null
    expect(pendingError).toBeNull()
    expect(Number(pending?.total_collected_amount)).toBe(80)
    expect(Number(pending?.pending_reversal_count)).toBe(1)
    expect(Number(pending?.pending_reversal_amount)).toBe(80)
    expect(Number(pending?.total_fees)).toBe(7)

    await adminClient
      .from('orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', orderId)

    const { data: archivedSummary, error: archivedError } = await client
      .rpc('get_cod_summary', { p_seller_id: sellerId })
      .single()
    const archived = archivedSummary as CodSummaryRow | null
    expect(archivedError).toBeNull()
    expect(Number(archived?.pending_reversal_count)).toBe(1)
    expect(Number(archived?.pending_reversal_amount)).toBe(80)

    const { error: reversalError } = await client.rpc('mark_delivery_cod_reversed', {
      p_delivery_id: deliveryId,
      p_seller_id: sellerId,
      p_amount: 60,
      p_reversed_by: sellerId,
    })
    expect(reversalError).toBeNull()

    const { data: reversedSummary, error: reversedError } = await client
      .rpc('get_cod_summary', { p_seller_id: sellerId })
      .single()
    const reversed = reversedSummary as CodSummaryRow | null
    expect(reversedError).toBeNull()
    expect(Number(reversed?.total_reversed_amount)).toBe(60)
    expect(Number(reversed?.pending_reversal_count)).toBe(0)
  })

  it('rejects operators because the summary contains financial totals', async () => {
    const memberEmail = `cod-operator-${Date.now()}@hanut-test.local`
    const { data: memberUser, error: userError } = await adminClient.auth.admin.createUser({
      email: memberEmail,
      password: 'Test1234!',
      email_confirm: true,
    })
    expect(userError).toBeNull()
    const memberId = memberUser.user!.id

    try {
      const { error: memberError } = await adminClient.from('team_members').insert({
        seller_id: sellerId,
        user_id: memberId,
        email: memberEmail,
        role: 'operator',
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      expect(memberError).toBeNull()

      const operatorClient = await authenticateAs(memberEmail)
      const { error } = await operatorClient.rpc('get_cod_summary', {
        p_seller_id: sellerId,
      })

      expect(error?.message).toContain('UNAUTHORIZED')
    } finally {
      await adminClient.from('team_members').delete().eq('user_id', memberId)
      await adminClient.auth.admin.deleteUser(memberId)
    }
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
