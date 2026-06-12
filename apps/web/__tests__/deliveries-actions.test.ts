import { beforeEach, describe, expect, it, vi } from 'vitest'

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
}))

vi.mock('next/cache', () => ({
  revalidatePath: serverMock.revalidatePath,
  revalidateTag: serverMock.revalidateTag,
}))

vi.mock('@/lib/activity', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}))

import { createDelivery, updateDelivery, deleteDelivery } from '../app/(dashboard)/deliveries/actions'

function mockContext(role: 'admin' | 'operator' | 'readonly' = 'admin') {
  contextMock.getUserContext.mockResolvedValue({
    userId: 'user-1',
    sellerId: 'seller-1',
    role,
    isSeller: role === 'admin',
    plan: 'pro',
  })
}

function makeChain(data: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single: vi.fn().mockResolvedValue({ data, error }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }
  return chain
}

describe('createDelivery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContext()
  })

  it('creates a delivery for a confirmed order', async () => {
    const orderQuery = makeChain({ id: 'order-1', status: 'confirmed' })
    const noExistingDelivery = makeChain(null)
    const sellerQuery = makeChain({ name: 'Boutique' })
    const rpc = vi.fn().mockResolvedValue({ error: null })

    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'orders') return orderQuery
        if (table === 'deliveries') return noExistingDelivery
        if (table === 'sellers') return sellerQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc,
    })

    const result = await createDelivery({ order_id: 'order-1', carrier: 'intigo' })

    expect(result.error).toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('create_delivery_from_order', expect.objectContaining({
      p_seller_id: 'seller-1',
      p_user_id: 'user-1',
      p_order_id: 'order-1',
      p_carrier: 'intigo',
    }))
  })

  it('rejects delivery creation for a pending order', async () => {
    const orderQuery = makeChain({ id: 'order-1', status: 'pending' })

    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'orders') return orderQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
    })

    const result = await createDelivery({ order_id: 'order-1', carrier: 'intigo' })

    expect(result.error).toContain('Confirmée')
  })

  it('rejects delivery if an active delivery already exists', async () => {
    const orderQuery = makeChain({ id: 'order-1', status: 'confirmed' })
    const existingDelivery = makeChain({ id: 'delivery-existing' })

    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'orders') return orderQuery
        if (table === 'deliveries') return existingDelivery
        throw new Error(`Unexpected table: ${table}`)
      }),
    })

    const result = await createDelivery({ order_id: 'order-1', carrier: 'intigo' })

    expect(result.error).toContain('livraison active')
  })

  it('blocks readonly role', async () => {
    mockContext('readonly')

    const result = await createDelivery({ order_id: 'order-1', carrier: 'intigo' })

    expect(result.error).toContain('réservée')
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })
})

describe('updateDelivery — COD collected', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContext()
  })

  it('calls mark_delivery_cod_collected RPC before patch fields', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: 'order-1', error: null })  // mark_delivery_cod_collected
    const sellerQuery = makeChain({ name: 'Boutique' })
    const patchChain = {
      update: vi.fn(() => patchChain),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'sellers') return sellerQuery
        if (table === 'deliveries') return patchChain
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc,
    })

    const result = await updateDelivery('delivery-1', {
      cod_collected: true,
      tracking_number: 'TRK123',
      fee: 7,
    })

    expect(result.error).toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('mark_delivery_cod_collected', expect.objectContaining({
      p_delivery_id: 'delivery-1',
      p_seller_id: 'seller-1',
    }))
  })

  it('does not call patch if RPC fails', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'DELIVERY_NOT_FOUND' } })
    const patchSpy = vi.fn()

    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn(() => ({ update: patchSpy })),
      rpc,
    })

    const result = await updateDelivery('delivery-1', { cod_collected: true })

    expect(result.error).toBe('DELIVERY_NOT_FOUND')
    expect(patchSpy).not.toHaveBeenCalled()
  })

  it('returns a handled error when trying to undo an already reversed COD', async () => {
    const currentDeliveryQuery = makeChain({
      cod_collected: true,
      cod_reversed: true,
    })

    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'deliveries') return currentDeliveryQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
    })

    const result = await updateDelivery('delivery-1', { cod_reversed: false })

    expect(result.error).toBe("Impossible d'annuler un COD déjà reversé.")
  })
})

describe('deleteDelivery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContext()
  })

  it('prevents deletion when COD is already collected', async () => {
    const deliveryQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'delivery-1',
          cod_collected: true,
          carrier: 'intigo',
          order: { id: 'order-1', status: 'delivered', seller_id: 'seller-1' },
        },
      }),
    }

    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'deliveries') return deliveryQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
    })

    const result = await deleteDelivery('delivery-1')

    expect(result.error).toContain('COD')
  })

  it('rolls back order to confirmed through the status RPC on delete of shipped delivery', async () => {
    const deliveryQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'delivery-1',
          cod_collected: false,
          carrier: 'navex',
          order: { id: 'order-1', status: 'shipped', seller_id: 'seller-1' },
        },
      }),
      delete: vi.fn().mockReturnThis(),
    }
    const deleteChain = { eq: vi.fn().mockResolvedValue({ error: null }) }
    const sellerQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Boutique' } }) }
    const rpc = vi.fn().mockResolvedValue({ error: null })

    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'deliveries') return { ...deliveryQuery, delete: vi.fn().mockReturnValue(deleteChain) }
        if (table === 'sellers') return sellerQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc,
    })

    const result = await deleteDelivery('delivery-1')

    expect(result.error).toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('update_order_status', expect.objectContaining({
      p_order_id: 'order-1',
      p_new_status: 'confirmed',
      p_seller_id: 'seller-1',
    }))
  })
})
