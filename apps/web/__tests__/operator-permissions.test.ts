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

vi.mock('@/lib/activity', () => ({
  logActivity: activityMock.logActivity,
}))

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

import { createOrder, deleteOrder } from '../app/(dashboard)/orders/actions'
import type { CreateOrderInput } from '../app/(dashboard)/orders/actions'
import { deleteProduct } from '../app/(dashboard)/catalog/actions'
import {
  anonymizeCustomer,
  deleteCustomer,
} from '../app/(dashboard)/customers/actions'

function mockContext(role: 'admin' | 'operator' | 'readonly') {
  contextMock.getUserContext.mockResolvedValue({
    userId: 'user-1',
    sellerId: 'seller-1',
    role,
    isSeller: role === 'admin',
    plan: 'pro',
    demoExpiresAt: null,
    demoExpired: false,
    daysLeft: null,
  })
}

function mockServerClientForCreate(error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ error })
  const sellerQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Boutique' } }) }
  const productQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { name: 'Produit' } }) }
  serverMock.createServerClient.mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === 'products') return productQuery
      if (table === 'sellers') return sellerQuery
      throw new Error(`Unexpected table: ${table}`)
    }),
    rpc,
  })
  return { rpc }
}

const orderInput: CreateOrderInput = {
  customer_name: 'Fatima',
  customer_phone: '22222222',
  product_id: 'product-1',
  quantity: 1,
  cod_amount: 50,
}

describe('role-based permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('operator cannot delete an order', async () => {
    mockContext('operator')

    const result = await deleteOrder('order-1')

    expect(result.error).toBe('Seuls les admins peuvent supprimer des commandes')
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })

  it('operator can create an order', async () => {
    mockContext('operator')
    const { rpc } = mockServerClientForCreate()

    const result = await createOrder(orderInput)

    expect(result.error).toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('create_order_with_stock', expect.objectContaining({
      p_seller_id: 'seller-1',
      p_status: 'new',
    }))
  })

  it('readonly cannot create an order', async () => {
    mockContext('readonly')

    const result = await createOrder(orderInput)

    expect(result.error).toBe('Action réservée aux admins et opérateurs')
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })

  it('operator cannot delete a delivered order', async () => {
    mockContext('operator')

    const result = await deleteOrder('delivered-order-id')

    expect(result.error).toBe('Seuls les admins peuvent supprimer des commandes')
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })

  it('operator cannot delete a product', async () => {
    mockContext('operator')

    const result = await deleteProduct('product-id')

    expect(result.error).toBe('Seuls les admins peuvent supprimer des produits')
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })

  it('operator cannot delete a customer', async () => {
    mockContext('operator')

    const result = await deleteCustomer('customer-id')

    expect(result.error).toBe('Seuls les admins peuvent supprimer des clients')
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })

  it('operator cannot anonymize a customer', async () => {
    mockContext('operator')

    const result = await anonymizeCustomer('customer-id')

    expect(result.error).toBe('Seuls les admins peuvent anonymiser des clients')
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })

  it('admin anonymizes through the guarded RPC without logging customer PII', async () => {
    mockContext('admin')

    const sellerQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Boutique' } }),
    }
    const rpc = vi.fn().mockResolvedValue({ error: null })
    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'sellers') return sellerQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc,
    })

    const result = await anonymizeCustomer('customer-id')

    expect(result.error).toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('anonymize_customer', {
      p_seller_id: 'seller-1',
      p_customer_id: 'customer-id',
    })
    expect(activityMock.logActivity).toHaveBeenCalledWith(expect.objectContaining({
      entityId: 'customer-id',
      description: 'a anonymisé les données personnelles d’un client',
    }))
    expect(serverMock.revalidatePath).toHaveBeenCalledWith('/customers/customer-id')
  })

  it('admin can soft-delete a pending order', async () => {
    mockContext('admin')

    const orderQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { status: 'pending', cod_amount: 50, product_id: 'p-1', quantity: 1, customer: { name: 'Fatima' } },
      }),
    }
    const sellerQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Boutique' } }),
    }
    const rpc = vi.fn().mockResolvedValue({ error: null })
    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'orders') return orderQuery
        if (table === 'sellers') return sellerQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc,
    })

    const result = await deleteOrder('pending-order-id')

    expect(result.error).toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('soft_delete_order_with_stock', expect.objectContaining({
      p_seller_id: 'seller-1',
      p_order_id: 'pending-order-id',
    }))
    expect(serverMock.revalidatePath).toHaveBeenCalledWith('/orders')
  })
})
