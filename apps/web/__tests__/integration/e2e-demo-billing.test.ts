/**
 * E2E integration tests — demo expiry and billing plan limits.
 * Requires: npx supabase start (from repo root)
 */

import { describe as vitestDescribe, it, expect, afterEach } from 'vitest'
import {
  adminClient,
  createTestSeller,
  cleanupSeller,
  hasIntegrationEnv,
} from './setup'

const describe = hasIntegrationEnv ? vitestDescribe : vitestDescribe.skip

let sellerId: string

async function createProduct() {
  const { data, error } = await adminClient.from('products').insert({
    seller_id: sellerId,
    name: 'Demo Billing Product',
    price: 30,
    stock: 20,
    low_stock_alert: 2,
    variants: [],
  }).select('id').single()

  if (error || !data) throw new Error(`Product setup failed: ${error?.message}`)
  return data.id
}

afterEach(async () => {
  if (sellerId) await cleanupSeller(sellerId)
})

describe('E2E — Démo et expiration', () => {
  it('boutique expirée ne peut plus créer de commande', async () => {
    const seller = await createTestSeller('e2e-expired')
    sellerId = seller.id
    const productId = await createProduct()

    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { error: updateError } = await adminClient
      .from('sellers')
      .update({ subscription_end: expiredDate })
      .eq('id', sellerId)
    expect(updateError).toBeNull()

    const { error } = await adminClient.rpc('create_order_with_stock', {
      p_seller_id: sellerId,
      p_product_id: productId,
      p_quantity: 1,
      p_customer_name: 'Client Expiré',
      p_customer_phone: '55123001',
      p_status: 'new',
      p_changed_by: sellerId,
    })
    expect(error?.message).toContain('SHOP_INACTIVE')
  })

  it('boutique active peut créer une commande', async () => {
    const seller = await createTestSeller('e2e-active')
    sellerId = seller.id
    const productId = await createProduct()

    const { data, error } = await adminClient.rpc('create_order_with_stock', {
      p_seller_id: sellerId,
      p_product_id: productId,
      p_quantity: 1,
      p_customer_name: 'Client Actif',
      p_customer_phone: '55123002',
      p_status: 'new',
      p_changed_by: sellerId,
    })
    expect(error).toBeNull()
    expect(data).toBeTruthy()
  })

  it('plan Starter — nouveau seller a 0 commandes ce mois', async () => {
    const seller = await createTestSeller('e2e-starter')
    sellerId = seller.id

    const { error: planError } = await adminClient
      .from('sellers')
      .update({ plan: 'starter' })
      .eq('id', sellerId)
    expect(planError).toBeNull()

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await adminClient
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .is('deleted_at', null)
      .gte('created_at', startOfMonth.toISOString())

    expect(count).toBe(0)
  })

  it('plan Starter — commandes du mois incrémentent le compteur', async () => {
    const seller = await createTestSeller('e2e-starter-count')
    sellerId = seller.id

    const { error: planError } = await adminClient
      .from('sellers')
      .update({ plan: 'starter' })
      .eq('id', sellerId)
    expect(planError).toBeNull()
    const productId = await createProduct()

    // Create 3 orders
    for (let i = 0; i < 3; i++) {
      const { error } = await adminClient.rpc('create_order_with_stock', {
        p_seller_id:      sellerId,
        p_product_id:     productId,
        p_quantity:       1,
        p_customer_name:  `Client ${i}`,
        p_customer_phone: `5512345${i}`,
        p_status:         'new',
        p_changed_by:     sellerId,
      })
      expect(error).toBeNull()
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await adminClient
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .is('deleted_at', null)
      .gte('created_at', startOfMonth.toISOString())

    expect(count).toBe(3)
  })
})
