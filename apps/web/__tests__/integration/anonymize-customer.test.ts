import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  adminClient,
  authenticateAs,
  cleanupSeller,
  createTestSeller,
  hasIntegrationEnv,
} from './setup'

const describeIf = hasIntegrationEnv ? describe : describe.skip

describeIf('anonymize_customer RPC', () => {
  let seller: { id: string; email: string }
  let customerId: string
  let orderId: string
  let operatorId: string
  let operatorEmail: string

  beforeAll(async () => {
    seller = await createTestSeller('anonymize-customer')

    const { data: product, error: productError } = await adminClient
      .from('products')
      .insert({
        seller_id: seller.id,
        name: 'Produit anonymisation',
        price: 80,
        cost: 30,
        stock: 10,
      })
      .select('id')
      .single()
    if (productError || !product) {
      throw new Error(`Anonymize product setup failed: ${productError?.message}`)
    }

    const ownerClient = await authenticateAs(seller.email)
    const { data: createdOrderId, error: orderError } = await ownerClient.rpc(
      'create_order_with_stock',
      {
        p_seller_id: seller.id,
        p_product_id: product.id,
        p_quantity: 1,
        p_customer_name: 'Client Secret',
        p_customer_phone: '55123456',
        p_customer_email: 'client-secret@example.com',
        p_customer_address: '10 rue privée',
        p_customer_city: 'Tunis',
        p_status: 'new',
      },
    )
    if (orderError || !createdOrderId) {
      throw new Error(`Anonymize order setup failed: ${orderError?.message}`)
    }
    orderId = createdOrderId as string

    const { data: order, error: orderLookupError } = await adminClient
      .from('orders')
      .select('customer_id')
      .eq('id', orderId)
      .single()
    if (orderLookupError || !order?.customer_id) {
      throw new Error(`Anonymize customer lookup failed: ${orderLookupError?.message}`)
    }
    customerId = order.customer_id

    // Définir des champs d'adresse structurée pour vérifier qu'ils sont bien effacés.
    await adminClient.from('customers').update({
      customer_governorate: 'Tunis',
      customer_city: 'La Marsa',
      customer_delegation: 'Carthage',
      customer_address: '5 rue des oliviers',
      customer_landmark: 'Près du café central',
      customer_postal_code: '2070',
      delivery_notes: 'Sonner 2 fois',
    }).eq('id', customerId)

    await adminClient.from('orders').update({
      customer_governorate: 'Tunis',
      customer_delegation: 'Carthage',
      customer_landmark: 'Près du café central',
      customer_postal_code: '2070',
      delivery_notes: 'Sonner 2 fois',
    }).eq('id', orderId)

    await adminClient.from('customer_addresses').insert({
      seller_id: seller.id,
      customer_id: customerId,
      customer_governorate: 'Tunis',
      customer_city: 'La Marsa',
      customer_delegation: 'Carthage',
      customer_address: '5 rue des oliviers',
      customer_landmark: 'Près du café central',
      customer_postal_code: '2070',
      delivery_notes: 'Sonner 2 fois',
    })

    const { error: logError } = await adminClient.from('activity_logs').insert({
      seller_id: seller.id,
      user_id: seller.id,
      action_type: 'customer_updated',
      entity_type: 'customer',
      entity_id: customerId,
      description: 'a modifié le client Client Secret',
      metadata: { phone: '55123456' },
    })
    if (logError) throw new Error(`Anonymize activity setup failed: ${logError.message}`)

    operatorEmail = `operator-anonymize-${Date.now()}@hanut-test.local`
    const { data: operatorUser, error: operatorError } = await adminClient.auth.admin.createUser({
      email: operatorEmail,
      password: 'Test1234!',
      email_confirm: true,
    })
    if (operatorError || !operatorUser.user) {
      throw new Error(`Anonymize operator setup failed: ${operatorError?.message}`)
    }
    operatorId = operatorUser.user.id

    const { error: memberError } = await adminClient.from('team_members').insert({
      seller_id: seller.id,
      user_id: operatorId,
      email: operatorEmail,
      role: 'operator',
      status: 'active',
      joined_at: new Date().toISOString(),
    })
    if (memberError) throw new Error(`Anonymize membership setup failed: ${memberError.message}`)
  })

  afterAll(async () => {
    if (operatorId) {
      await adminClient.from('team_members').delete().eq('user_id', operatorId)
      await adminClient.auth.admin.deleteUser(operatorId).catch(() => {})
    }
    if (seller) await cleanupSeller(seller.id)
  })

  it('rejects an operator and keeps PII unchanged', async () => {
    const operatorClient = await authenticateAs(operatorEmail)
    const { error } = await operatorClient.rpc('anonymize_customer', {
      p_seller_id: seller.id,
      p_customer_id: customerId,
    })

    expect(error).not.toBeNull()

    const { data: customer } = await adminClient
      .from('customers')
      .select('name, phone')
      .eq('id', customerId)
      .single()

    expect(customer).toMatchObject({
      name: 'Client Secret',
      phone: '55123456',
    })
  })

  it('anonymizes PII, scrubs audit logs and preserves the order', async () => {
    const ownerClient = await authenticateAs(seller.email)
    const { error } = await ownerClient.rpc('anonymize_customer', {
      p_seller_id: seller.id,
      p_customer_id: customerId,
    })

    expect(error).toBeNull()

    const [
      { data: customer },
      { data: order },
      { data: addresses },
      { data: logs },
    ] = await Promise.all([
      adminClient
        .from('customers')
        .select('name, phone, email, address, city, notes, tags, customer_governorate, customer_city, customer_delegation, customer_address, customer_landmark, customer_postal_code, delivery_notes')
        .eq('id', customerId)
        .single(),
      adminClient
        .from('orders')
        .select('id, customer_id, customer_email, customer_governorate, customer_delegation, customer_landmark, customer_postal_code, delivery_notes')
        .eq('id', orderId)
        .single(),
      adminClient
        .from('customer_addresses')
        .select('id')
        .eq('customer_id', customerId),
      adminClient
        .from('activity_logs')
        .select('description, metadata')
        .eq('seller_id', seller.id)
        .eq('entity_type', 'customer')
        .eq('entity_id', customerId),
    ])

    // Champs nominatifs (couverts depuis v1)
    expect(customer).toMatchObject({
      name: 'Client anonymisé',
      phone: '00000000',
      email: null,
      address: null,
      city: null,
      notes: null,
      tags: [],
    })
    // Champs d'adresse structurée (ajoutés en migration 20260716 — corrigés en v3)
    expect(customer).toMatchObject({
      customer_governorate: null,
      customer_city: null,
      customer_delegation: null,
      customer_address: null,
      customer_landmark: null,
      customer_postal_code: null,
      delivery_notes: null,
    })
    // Champs dénormalisés sur orders
    expect(order).toMatchObject({
      id: orderId,
      customer_id: customerId,
      customer_email: null,
      customer_governorate: null,
      customer_delegation: null,
      customer_landmark: null,
      customer_postal_code: null,
      delivery_notes: null,
    })
    // Historique d'adresses purgé
    expect(addresses).toEqual([])
    expect(logs).toEqual([
      { description: 'Données client anonymisées', metadata: {} },
    ])
  })
})
