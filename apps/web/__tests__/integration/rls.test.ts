/**
 * Integration tests for RLS (Row Level Security) multi-tenant isolation.
 * Requires: npx supabase start (from repo root)
 */

import { describe as vitestDescribe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  adminClient,
  createTestSeller,
  authenticateAs,
  cleanupSeller,
  hasIntegrationEnv,
} from './setup'

const describe = hasIntegrationEnv ? vitestDescribe : vitestDescribe.skip

let sellerA: { id: string; email: string }
let sellerB: { id: string; email: string }
let productA: string
let orderA: string

beforeAll(async () => {
  sellerA = await createTestSeller('rls-a')
  sellerB = await createTestSeller('rls-b')

  const { data: product } = await adminClient.from('products').insert({
    seller_id: sellerA.id,
    name: 'Seller A Product',
    price: 60, cost: 25, stock: 20, low_stock_alert: 3, variants: [],
  }).select('id').single()
  productA = product!.id

  const clientA = await authenticateAs(sellerA.email)
  const { data: oid } = await clientA.rpc('create_order_with_stock', {
    p_seller_id: sellerA.id, p_product_id: productA, p_quantity: 1,
    p_customer_name: 'RLS Customer', p_customer_phone: '21655555555', p_status: 'new',
  })
  orderA = oid as string
})

afterAll(async () => {
  await cleanupSeller(sellerA.id)
  await cleanupSeller(sellerB.id)
})

describe('multi-tenant isolation', () => {
  it('seller B cannot read orders of seller A', async () => {
    const clientB = await authenticateAs(sellerB.email)

    const { data: orders } = await clientB.from('orders').select('id').eq('id', orderA)

    expect(orders).toHaveLength(0)
  })

  it('seller B cannot read products of seller A', async () => {
    const clientB = await authenticateAs(sellerB.email)

    const { data: products } = await clientB.from('products').select('id').eq('id', productA)

    expect(products).toHaveLength(0)
  })

  it('seller A can read their own orders', async () => {
    const clientA = await authenticateAs(sellerA.email)

    const { data: orders } = await clientA.from('orders').select('id').eq('id', orderA)

    expect(orders).toHaveLength(1)
    expect(orders![0].id).toBe(orderA)
  })

  it('seller B cannot update seller A orders via RPC', async () => {
    const clientB = await authenticateAs(sellerB.email)

    const { error } = await clientB.rpc('update_order_status', {
      p_seller_id:  sellerA.id,
      p_order_id:   orderA,
      p_new_status: 'confirmed',
      p_changed_by: sellerB.id,
    })

    // RPC checks can_write_seller — should fail
    expect(error).not.toBeNull()

    // Order status must not have changed
    const { data: order } = await adminClient.from('orders').select('status').eq('id', orderA).single()
    expect(order!.status).toBe('new')
  })

  it('seller A cannot read seller B seller profile', async () => {
    const clientA = await authenticateAs(sellerA.email)

    const { data: sellers } = await clientA.from('sellers').select('id').eq('id', sellerB.id)

    // RLS on sellers: only own row or active team member
    expect(sellers).toHaveLength(0)
  })
})

describe('team member access', () => {
  it('active team member can read their seller orders', async () => {
    // Create a team member for sellerA
    const memberEmail = `team-member-${Date.now()}@hanut-test.local`
    const { data: memberUser } = await adminClient.auth.admin.createUser({
      email: memberEmail, password: 'Test1234!', email_confirm: true,
    })
    const memberId = memberUser.user!.id

    await adminClient.from('team_members').insert({
      seller_id: sellerA.id,
      user_id: memberId,
      email: memberEmail,
      role: 'operator',
      status: 'active',
      joined_at: new Date().toISOString(),
    })

    const memberClient = await authenticateAs(memberEmail)

    const { data: orders } = await memberClient.from('orders').select('id').eq('id', orderA)
    expect(orders).toHaveLength(1)

    // Cleanup
    await adminClient.from('team_members').delete().eq('user_id', memberId)
    await adminClient.auth.admin.deleteUser(memberId)
  })

  it('readonly team member cannot write orders', async () => {
    const memberEmail = `readonly-member-${Date.now()}@hanut-test.local`
    const { data: memberUser } = await adminClient.auth.admin.createUser({
      email: memberEmail, password: 'Test1234!', email_confirm: true,
    })
    const memberId = memberUser.user!.id

    await adminClient.from('team_members').insert({
      seller_id: sellerA.id,
      user_id: memberId,
      email: memberEmail,
      role: 'readonly',
      status: 'active',
      joined_at: new Date().toISOString(),
    })

    const memberClient = await authenticateAs(memberEmail)

    // readonly cannot insert orders (RLS: can_write_seller = false for readonly)
    const { error } = await memberClient.from('orders').insert({
      seller_id: sellerA.id,
      product_id: productA,
      customer_id: '00000000-0000-0000-0000-000000000000',
      quantity: 1,
      cod_amount: 50,
      status: 'new',
      unit_cost: 0,
    })
    expect(error).not.toBeNull()

    // Cleanup
    await adminClient.from('team_members').delete().eq('user_id', memberId)
    await adminClient.auth.admin.deleteUser(memberId)
  })

  it('pending invitee cannot self-activate or promote their role to admin', async () => {
    const memberEmail = `pending-member-${Date.now()}@hanut-test.local`
    const { data: memberUser } = await adminClient.auth.admin.createUser({
      email: memberEmail, password: 'Test1234!', email_confirm: true,
    })
    const memberId = memberUser.user!.id

    try {
      const { data: invite, error: inviteError } = await adminClient
        .from('team_members')
        .insert({
          seller_id: sellerA.id,
          email: memberEmail,
          role: 'operator',
          status: 'pending',
        })
        .select('id')
        .single()
      expect(inviteError).toBeNull()

      const memberClient = await authenticateAs(memberEmail)
      await memberClient
        .from('team_members')
        .update({
          user_id: memberId,
          status: 'active',
          role: 'admin',
          joined_at: new Date().toISOString(),
        })
        .eq('id', invite!.id)

      const { data: row } = await adminClient
        .from('team_members')
        .select('user_id, status, role')
        .eq('id', invite!.id)
        .single()

      expect(row).toEqual({
        user_id: null,
        status: 'pending',
        role: 'operator',
      })
    } finally {
      await adminClient.from('team_members').delete().eq('email', memberEmail)
      await adminClient.auth.admin.deleteUser(memberId)
    }
  })
})
