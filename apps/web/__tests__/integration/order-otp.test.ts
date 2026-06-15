import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe as vitestDescribe, expect, it } from 'vitest'
import {
  adminClient,
  cleanupSeller,
  createTestSeller,
  hasIntegrationEnv,
} from './setup'

const describe = hasIntegrationEnv ? vitestDescribe : vitestDescribe.skip

let sellerId: string
let sellerSlug: string
let productId: string
const email = 'otp-client@example.com'
const code = '1234'

function hashCode() {
  const secret = process.env.SUPABASE_TEST_SERVICE_KEY ?? ''
  return createHmac('sha256', secret)
    .update(`${sellerSlug}:${email}:${code}`)
    .digest('hex')
}

async function insertOtp() {
  const { data, error } = await adminClient
    .from('order_otps')
    .insert({
      seller_id: sellerId,
      slug: sellerSlug,
      email,
      code_hash: hashCode(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(`OTP setup failed: ${error?.message}`)
  return data.id
}

beforeEach(async () => {
  const seller = await createTestSeller('order-otp')
  sellerId = seller.id

  const { data: sellerRow, error: sellerError } = await adminClient
    .from('sellers')
    .select('slug')
    .eq('id', sellerId)
    .single()
  if (sellerError || !sellerRow?.slug) throw new Error(`Seller slug setup failed: ${sellerError?.message}`)
  sellerSlug = sellerRow.slug

  const { data: product, error: productError } = await adminClient
    .from('products')
    .insert({
      seller_id: sellerId,
      name: 'OTP Product',
      price: 40,
      cost: 10,
      stock: 3,
    })
    .select('id')
    .single()
  if (productError || !product) throw new Error(`Product setup failed: ${productError?.message}`)
  productId = product.id
})

afterEach(async () => {
  await adminClient.from('order_otps').delete().eq('slug', sellerSlug)
  await cleanupSeller(sellerId)
})

describe('public order OTP transaction', () => {
  it('creates one order and consumes the OTP atomically', async () => {
    const otpId = await insertOtp()

    const { data, error } = await adminClient.rpc('create_public_order_with_otp', {
      p_slug: sellerSlug,
      p_email: email,
      p_code_hash: hashCode(),
      p_product_id: productId,
      p_quantity: 1,
      p_customer_name: 'Client OTP',
      p_customer_phone: '22123456',
      p_customer_address: 'Rue OTP',
      p_customer_city: 'Tunis',
    })

    expect(error).toBeNull()
    expect(data).toMatchObject({ ok: true })

    const [{ data: otp }, { data: orders }] = await Promise.all([
      adminClient.from('order_otps').select('verified').eq('id', otpId).single(),
      adminClient.from('orders').select('customer_email').eq('seller_id', sellerId),
    ])
    expect(otp?.verified).toBe(true)
    expect(orders).toHaveLength(1)
    expect(orders?.[0]?.customer_email).toBe(email)
  })

  it('persists failed attempts and blocks after five incorrect codes', async () => {
    const otpId = await insertOtp()

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const { data, error } = await adminClient.rpc('create_public_order_with_otp', {
        p_slug: sellerSlug,
        p_email: email,
        p_code_hash: 'incorrect-hash',
        p_product_id: productId,
        p_quantity: 1,
        p_customer_name: 'Client OTP',
        p_customer_phone: '22123456',
      })
      expect(error).toBeNull()
      expect(data).toMatchObject({
        ok: false,
        error: attempt === 5 ? 'OTP_TOO_MANY_ATTEMPTS' : 'OTP_INCORRECT',
      })
    }

    const { data: otp } = await adminClient
      .from('order_otps')
      .select('attempts, verified')
      .eq('id', otpId)
      .single()
    expect(otp).toEqual({ attempts: 5, verified: false })
  })

  it('does not consume the OTP when order creation fails', async () => {
    const otpId = await insertOtp()
    await adminClient.from('products').update({ stock: 0 }).eq('id', productId)

    const { data, error } = await adminClient.rpc('create_public_order_with_otp', {
      p_slug: sellerSlug,
      p_email: email,
      p_code_hash: hashCode(),
      p_product_id: productId,
      p_quantity: 1,
      p_customer_name: 'Client OTP',
      p_customer_phone: '22123456',
    })

    expect(error).toBeNull()
    expect(data).toMatchObject({
      ok: false,
      error: 'ORDER_CREATION_FAILED',
    })

    const { data: otp } = await adminClient
      .from('order_otps')
      .select('verified, attempts')
      .eq('id', otpId)
      .single()
    expect(otp).toEqual({ verified: false, attempts: 0 })
  })
})
