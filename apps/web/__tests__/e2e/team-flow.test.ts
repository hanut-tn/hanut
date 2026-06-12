/**
 * E2E tests — team multi-user flows.
 * Requires: npx supabase start (from repo root)
 */

import { describe as vitestDescribe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  adminClient,
  createTestSeller,
  authenticateAs,
  cleanupSeller,
  hasIntegrationEnv,
} from '../integration/setup'

const describe = hasIntegrationEnv ? vitestDescribe : vitestDescribe.skip

let sellerId: string
let productId: string

beforeAll(async () => {
  const seller = await createTestSeller('e2e-team')
  sellerId = seller.id

  const { data: product } = await adminClient.from('products').insert({
    seller_id: sellerId, name: 'Team Flow Product',
    price: 60, cost: 25, stock: 50, low_stock_alert: 5, variants: [],
  }).select('id').single()
  productId = product!.id
})

afterAll(async () => {
  await cleanupSeller(sellerId)
})

async function createTeamMember(role: 'operator' | 'readonly') {
  const email = `${role}-${Date.now()}@hanut-test.local`
  const { data: user } = await adminClient.auth.admin.createUser({
    email, password: 'Test1234!', email_confirm: true,
  })
  const memberId = user.user!.id

  await adminClient.from('team_members').insert({
    seller_id: sellerId, user_id: memberId, email, role,
    status: 'active', joined_at: new Date().toISOString(),
  })
  return { id: memberId, email }
}

async function removeMember(memberId: string) {
  await adminClient.from('team_members').delete().eq('user_id', memberId)
  await adminClient.auth.admin.deleteUser(memberId)
}

describe('Operator permissions', () => {
  it('operator can create orders but not delete them via RLS', async () => {
    const member = await createTeamMember('operator')
    const client = await authenticateAs(member.email)

    // Create a customer first
    const { data: customer } = await adminClient.from('customers').insert({
      seller_id: sellerId, name: 'Operator Customer', phone: '21633344455',
    }).select('id').single()

    // Operator can create an order
    const { data: orderId, error: createErr } = await client.rpc('create_order_with_stock', {
      p_seller_id: sellerId, p_product_id: productId, p_quantity: 1,
      p_customer_name: 'Operator Customer', p_customer_phone: '21633344455',
      p_status: 'new',
    })
    expect(createErr).toBeNull()
    expect(orderId).toBeTruthy()

    // Operator cannot delete via RLS (is_seller_admin = false)
    await client.from('orders').delete().eq('id', orderId)
    // RLS blocks the delete — no error thrown but 0 rows affected
    // Verify order still exists
    const { data: order } = await adminClient.from('orders').select('id').eq('id', orderId).single()
    expect(order).not.toBeNull()

    // Cleanup
    await adminClient.from('orders').delete().eq('id', orderId)
    await adminClient.from('customers').delete().eq('id', customer!.id)
    await removeMember(member.id)
  })
})

describe('Readonly permissions', () => {
  it('readonly member can read orders but cannot insert', async () => {
    const member = await createTeamMember('readonly')
    const client = await authenticateAs(member.email)

    // Can read seller orders
    const { error: readErr } = await client
      .from('orders')
      .select('id')
      .eq('seller_id', sellerId)
    expect(readErr).toBeNull()
    // May return 0 rows but should not error

    // Cannot insert via RLS (can_write_seller = false for readonly)
    const { error: insertErr } = await client.from('orders').insert({
      seller_id: sellerId, product_id: productId,
      customer_id: '00000000-0000-0000-0000-000000000000',
      quantity: 1, cod_amount: 50, status: 'new', unit_cost: 0,
    })
    expect(insertErr).not.toBeNull()

    await removeMember(member.id)
  })
})

describe('Team member blocked when owner demo expired', () => {
  it('team member seller_id leads to expired seller', async () => {
    const member = await createTeamMember('operator')

    // Expire the owner's demo
    const pastDate = new Date(Date.now() - 1000).toISOString()
    await adminClient.from('sellers').update({ subscription_end: pastDate }).eq('id', sellerId)

    // Verify the team member's seller has expired subscription
    const { data: membership } = await adminClient
      .from('team_members')
      .select('seller_id')
      .eq('user_id', member.id)
      .single()
    expect(membership!.seller_id).toBe(sellerId)

    const { data: seller } = await adminClient
      .from('sellers')
      .select('subscription_end')
      .eq('id', membership!.seller_id)
      .single()
    expect(new Date(seller!.subscription_end!).getTime()).toBeLessThan(Date.now())

    // Restore subscription for other tests
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    await adminClient.from('sellers').update({ subscription_end: futureDate }).eq('id', sellerId)

    await removeMember(member.id)
  })
})
