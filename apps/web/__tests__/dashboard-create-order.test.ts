import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateOrderInput } from '../app/(dashboard)/orders/actions'

const serverMock = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: serverMock.createServerClient,
}))

vi.mock('next/cache', () => ({
  revalidatePath: serverMock.revalidatePath,
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

function mockServerClient(userId: string | null, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ error })
  const getUser = vi.fn().mockResolvedValue({
    data: {
      user: userId ? { id: userId } : null,
    },
  })

  serverMock.createServerClient.mockResolvedValue({
    auth: { getUser },
    rpc,
  })

  return { getUser, rpc }
}

describe('createOrder dashboard action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires an authenticated seller', async () => {
    const { rpc } = mockServerClient(null)

    await expect(createOrder(input)).rejects.toThrow('Non autorisé')

    expect(rpc).not.toHaveBeenCalled()
    expect(serverMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('creates a new order through the transactional RPC using the session seller id', async () => {
    const { rpc } = mockServerClient('seller-1')

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
      })
    )
    expect(serverMock.revalidatePath).toHaveBeenCalledWith('/orders')
    expect(serverMock.revalidatePath).toHaveBeenCalledWith('/dashboard')
  })

  it('surfaces RPC errors and skips revalidation', async () => {
    mockServerClient('seller-1', { message: 'Stock insuffisant' })

    await expect(createOrder(input)).rejects.toThrow('Stock insuffisant')

    expect(serverMock.revalidatePath).not.toHaveBeenCalled()
  })
})
