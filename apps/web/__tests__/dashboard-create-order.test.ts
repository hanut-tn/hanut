import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateOrderInput } from '../app/(dashboard)/orders/actions'

const serverMock = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

const contextMock = vi.hoisted(() => ({
  getUserContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: serverMock.createServerClient,
}))

vi.mock('@/lib/get-context', () => ({
  getUserContext: contextMock.getUserContext,
  getMonthlyOrderCount: vi.fn().mockResolvedValue(0),
}))

vi.mock('next/cache', () => ({
  revalidatePath: serverMock.revalidatePath,
  revalidateTag: serverMock.revalidateTag,
}))

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/constants', () => ({
  DELETABLE_STATUSES: ['pending', 'new', 'confirmed'],
  ORDER_STATUS_LABELS: {
    pending: 'En attente', new: 'Nouveau', confirmed: 'Confirmé',
    shipped: 'Expédié', delivered: 'Livré', returned: 'Retourné',
  },
  PLAN_LIMITS: {
    starter: { ordersPerMonth: 100 },
    pro: { ordersPerMonth: Infinity },
    business: { ordersPerMonth: Infinity },
  },
}))

import { createOrder } from '../app/(dashboard)/orders/actions'

const input: CreateOrderInput = {
  customer_name: 'Fatima',
  customer_phone: '+21611111111',
  customer_address: 'Rue 1',
  customer_city: 'Tunis',
  product_id: 'product-1',
  variant: 'Noir',
  quantity: 2,
  cod_amount: 120,
  notes: 'Client VIP',
}

function mockContext(sellerId: string | null, role: 'admin' | 'operator' | 'readonly' = 'admin') {
  contextMock.getUserContext.mockResolvedValue(
    sellerId
      ? { userId: 'user-1', sellerId, role, isSeller: role === 'admin', plan: 'business' }
      : null
  )
}

function createSingleQuery(data: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn().mockResolvedValue({ data }),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  }
  return query
}

function mockServerClient(error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ error })
  const productQuery = createSingleQuery({ name: 'Produit test' })
  const sellerQuery = createSingleQuery({ name: 'Boutique test' })
  const from = vi.fn((table: string) => {
    if (table === 'products') return productQuery
    if (table === 'sellers') return sellerQuery
    throw new Error(`Unexpected table: ${table}`)
  })

  serverMock.createServerClient.mockResolvedValue({
    from,
    rpc,
  })

  return { from, rpc }
}

describe('createOrder dashboard action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires an authenticated seller', async () => {
    mockContext(null)

    const result = await createOrder(input)
    expect(result.error).toBe('Non autorisé')

    expect(serverMock.createServerClient).not.toHaveBeenCalled()
    expect(serverMock.revalidatePath).not.toHaveBeenCalled()
    expect(serverMock.revalidateTag).not.toHaveBeenCalled()
  })

  it('creates a new order through the transactional RPC using the effective seller id', async () => {
    mockContext('seller-1', 'operator')
    const { rpc } = mockServerClient()

    await createOrder(input)

    expect(rpc).toHaveBeenCalledWith(
      'create_order_with_stock',
      expect.objectContaining({
        p_seller_id: 'seller-1',
        p_product_id: 'product-1',
        p_quantity: 2,
        p_customer_name: 'Fatima',
        p_customer_phone: '+21611111111',
        p_customer_address: 'Rue 1',
        p_customer_city: 'Tunis',
        p_customer_id: null,
        p_variant: 'Noir',
        p_cod_amount: 120,
        p_notes: 'Client VIP',
        p_status: 'new',
        p_changed_by: 'user-1',
      })
    )
    expect(serverMock.revalidatePath).toHaveBeenCalledWith('/orders')
    expect(serverMock.revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(serverMock.revalidateTag).toHaveBeenCalledWith('dashboard')
  })

  it('surfaces RPC errors and skips revalidation', async () => {
    mockContext('seller-1')
    mockServerClient({ message: 'Stock insuffisant' })

    const result = await createOrder(input)
    expect(result.error).toBe('Stock insuffisant')

    expect(serverMock.revalidatePath).not.toHaveBeenCalled()
    expect(serverMock.revalidateTag).not.toHaveBeenCalled()
  })
})
