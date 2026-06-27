/**
 * Integration tests for get_analytics_data — top_products correctness.
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
let customerId: string

beforeEach(async () => {
  const seller = await createTestSeller('analytics-rpc')
  sellerId = seller.id

  const { data: customer } = await adminClient.from('customers').insert({
    seller_id: sellerId,
    name: 'Client Test',
    phone: '21612345678',
  }).select('id').single()
  customerId = customer!.id
})

afterEach(async () => {
  await cleanupSeller(sellerId)
})

describe('get_analytics_data — top_products', () => {
  it("classe en tête le produit avec le revenu le plus élevé, même s'il n'est pas le premier article", async () => {
    // Produit A : vendu une fois à 20 DT → revenu 20
    // Produit B : vendu deux fois à 30 DT → revenu 60 (doit être #1)
    const { data: prodA } = await adminClient.from('products').insert({
      seller_id: sellerId, name: 'Produit A', price: 20, cost: 5, stock: 10, low_stock_alert: 1, variants: [],
    }).select('id').single()

    const { data: prodB } = await adminClient.from('products').insert({
      seller_id: sellerId, name: 'Produit B', price: 30, cost: 8, stock: 10, low_stock_alert: 1, variants: [],
    }).select('id').single()

    // Commande multi-articles : premier article = Produit A (20 DT), deuxième = Produit B × 2 (60 DT)
    const { data: order } = await adminClient.from('orders').insert({
      seller_id:    sellerId,
      customer_id:  customerId,
      product_id:   prodA!.id,   // legacy champ = premier article
      quantity:     1,
      unit_cost:    5,
      cod_amount:   80,          // 20 + 60
      status:       'delivered',
    }).select('id').single()

    await adminClient.from('order_items').insert([
      { order_id: order!.id, seller_id: sellerId, product_id: prodA!.id, quantity: 1, unit_price: 20, unit_cost: 5 },
      { order_id: order!.id, seller_id: sellerId, product_id: prodB!.id, quantity: 2, unit_price: 30, unit_cost: 8 },
    ])

    const from = new Date(Date.now() - 86400_000).toISOString()
    const to   = new Date(Date.now() + 86400_000).toISOString()

    const { data, error } = await adminClient.rpc('get_analytics_data', {
      p_seller_id: sellerId,
      p_from:      from,
      p_to:        to,
    })

    expect(error).toBeNull()
    const topProducts: { id: string; name: string; revenue: number; count: number }[] = data.top_products

    expect(topProducts.length).toBeGreaterThanOrEqual(2)
    // Produit B doit être #1 (revenu 60 > revenu 20 du Produit A)
    expect(topProducts[0].name).toBe('Produit B')
    expect(Number(topProducts[0].revenue)).toBe(60)
    expect(topProducts[0].count).toBe(1)

    expect(topProducts[1].name).toBe('Produit A')
    expect(Number(topProducts[1].revenue)).toBe(20)
  })

  it("n'inclut pas les commandes annulées ou retournées dans top_products", async () => {
    const { data: prod } = await adminClient.from('products').insert({
      seller_id: sellerId, name: 'Produit Annulé', price: 100, cost: 10, stock: 10, low_stock_alert: 1, variants: [],
    }).select('id').single()

    const { data: order } = await adminClient.from('orders').insert({
      seller_id: sellerId, customer_id: customerId, product_id: prod!.id,
      quantity: 1, unit_cost: 10, cod_amount: 100, status: 'cancelled',
    }).select('id').single()

    await adminClient.from('order_items').insert([
      { order_id: order!.id, seller_id: sellerId, product_id: prod!.id, quantity: 1, unit_price: 100, unit_cost: 10 },
    ])

    const from = new Date(Date.now() - 86400_000).toISOString()
    const to   = new Date(Date.now() + 86400_000).toISOString()

    const { data } = await adminClient.rpc('get_analytics_data', {
      p_seller_id: sellerId, p_from: from, p_to: to,
    })

    const names = (data.top_products as { name: string }[]).map(p => p.name)
    expect(names).not.toContain('Produit Annulé')
  })
})
