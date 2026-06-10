import { beforeEach, describe, expect, it, vi } from 'vitest'

const serverMock = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

const contextMock = vi.hoisted(() => ({
  getUserContext: vi.fn(),
  getMonthlyOrderCount: vi.fn().mockResolvedValue(0),
}))

const activityMock = vi.hoisted(() => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: serverMock.createServerClient,
}))

vi.mock('@/lib/get-context', () => ({
  getUserContext: contextMock.getUserContext,
  getMonthlyOrderCount: contextMock.getMonthlyOrderCount,
}))

vi.mock('next/cache', () => ({
  revalidatePath: serverMock.revalidatePath,
  revalidateTag: serverMock.revalidateTag,
}))

vi.mock('@/lib/activity', () => activityMock)

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

vi.mock('@/lib/constants', () => ({
  DELETABLE_STATUSES: ['pending', 'new', 'confirmed'],
  ORDER_STATUS_LABELS: {
    pending: 'En attente', new: 'Nouveau', confirmed: 'Confirmé',
    shipped: 'Expédié', delivered: 'Livré', returned: 'Retourné', cancelled: 'Annulé',
  },
  PLAN_LIMITS: {
    starter: { ordersPerMonth: 100 },
    pro: { ordersPerMonth: Infinity },
    business: { ordersPerMonth: Infinity },
  },
}))

import { deleteOrder, restoreOrder, cancelPendingOrder } from '../app/(dashboard)/orders/actions'

function mockAdminContext() {
  contextMock.getUserContext.mockResolvedValue({
    userId: 'user-1',
    sellerId: 'seller-1',
    role: 'admin',
    isSeller: true,
    plan: 'pro',
    demoExpiresAt: null,
    demoExpired: false,
    daysLeft: null,
  })
}

function makeOrderQuery(status: string) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { status, cod_amount: 80, product_id: 'p-1', quantity: 1, customer: null },
    }),
  }
}

function makeSellerQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Boutique Test' } }),
    single: vi.fn().mockResolvedValue({ data: { name: 'Boutique Test' } }),
  }
}

describe('deleteOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdminContext()
  })

  it('returns CANNOT_DELETE for a delivered order', async () => {
    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'orders') return makeOrderQuery('delivered')
        if (table === 'sellers') return makeSellerQuery()
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc: vi.fn(),
    })

    const result = await deleteOrder('order-delivered')

    expect(result.error).toBe('CANNOT_DELETE')
  })

  it('returns CANNOT_DELETE for a returned order', async () => {
    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'orders') return makeOrderQuery('returned')
        if (table === 'sellers') return makeSellerQuery()
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc: vi.fn(),
    })

    const result = await deleteOrder('order-returned')

    expect(result.error).toBe('CANNOT_DELETE')
  })

  it('returns CANNOT_DELETE for a cancelled order', async () => {
    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'orders') return makeOrderQuery('cancelled')
        if (table === 'sellers') return makeSellerQuery()
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc: vi.fn(),
    })

    const result = await deleteOrder('order-cancelled')

    expect(result.error).toBe('CANNOT_DELETE')
  })

  it('soft-deletes a pending order and revalidates paths', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'orders') return makeOrderQuery('pending')
        if (table === 'sellers') return makeSellerQuery()
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc,
    })

    const result = await deleteOrder('order-pending')

    expect(result.error).toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('soft_delete_order_with_stock', expect.objectContaining({
      p_order_id: 'order-pending',
    }))
    expect(serverMock.revalidatePath).toHaveBeenCalledWith('/orders')
    expect(serverMock.revalidatePath).toHaveBeenCalledWith('/dashboard')
  })
})

describe('cancelPendingOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdminContext()
  })

  it('calls cancel RPC and logs with Annulée (not Retournée)', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'sellers') return makeSellerQuery()
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc,
    })

    await cancelPendingOrder('order-pending')

    expect(rpc).toHaveBeenCalledWith('cancel_pending_order_with_stock', expect.objectContaining({
      p_order_id: 'order-pending',
      p_seller_id: 'seller-1',
    }))
    expect(activityMock.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('Annulée'),
      })
    )
    expect(activityMock.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.not.stringContaining('Retournée'),
      })
    )
  })
})

describe('restoreOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdminContext()
  })

  it('restores an order from trash via RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'sellers') return makeSellerQuery()
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc,
    })

    const result = await restoreOrder('order-trashed')

    expect(result.error).toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('restore_trashed_order_with_stock', expect.objectContaining({
      p_order_id: 'order-trashed',
      p_seller_id: 'seller-1',
    }))
    expect(serverMock.revalidatePath).toHaveBeenCalledWith('/orders')
  })
})
