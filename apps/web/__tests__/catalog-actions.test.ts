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

vi.mock('@/lib/variants', () => ({
  getVariantLabel: (v: { size?: string; color?: string; name?: string }, i: number) => {
    if (v.size && v.color) return `${v.size} / ${v.color}`
    if (v.size) return v.size
    if (v.color) return v.color
    if (v.name) return v.name
    return `Variante ${i + 1}`
  },
  sumVariantStock: (variants: { qty: number }[]) => variants.reduce((s, v) => s + v.qty, 0),
}))

import { adjustStock } from '../app/(dashboard)/catalog/actions'

function mockContext(role: 'admin' | 'operator' | 'readonly' = 'admin') {
  contextMock.getUserContext.mockResolvedValue({
    userId: 'user-1',
    sellerId: 'seller-1',
    role,
    isSeller: role === 'admin',
    plan: 'pro',
  })
}

describe('adjustStock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContext()
  })

  it('calls the stock RPC for variant products without direct product updates', async () => {
    const productQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          stock: 8,
          cost: 10,
          name: 'Produit variantes',
          variants: [
            { size: 'S', qty: 3 },
            { size: 'M', qty: 5 },
          ],
        },
      }),
    }
    const sellerQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Boutique' } }),
    }
    const productUpdate = vi.fn()
    const rpc = vi.fn().mockResolvedValue({
      data: { stock_before: 8, stock_after: 10, delta: 2 },
      error: null,
    })

    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'products') {
          return { ...productQuery, update: productUpdate }
        }
        if (table === 'sellers') return sellerQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc,
    })

    const result = await adjustStock('product-1', {
      type: 'restock',
      quantity: 2,
      variantAdjustments: [{ label: 'S', value: 2 }],
    })

    expect(result.error).toBeUndefined()
    expect(productUpdate).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith('adjust_product_stock', expect.objectContaining({
      p_product_id: 'product-1',
      p_variant_name: 'S',
      p_delta: 2,
      p_unit_cost: null,
    }))
  })

  it('recalculates WAC on restock with costUpdateMode=wac', async () => {
    const productQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { stock: 5, cost: 10, name: 'Produit WAC', variants: [] },
      }),
    }
    const sellerQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Boutique' } }),
    }
    const productUpdate = vi.fn()
    const rpc = vi.fn().mockResolvedValue({
      data: { stock_before: 5, stock_after: 10, delta: 5 },
      error: null,
    })

    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'products') {
          return { ...productQuery, update: productUpdate }
        }
        if (table === 'sellers') return sellerQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc,
    })

    const result = await adjustStock('product-1', {
      type: 'restock',
      quantity: 5,
      unitCost: 20,
      costUpdateMode: 'wac',
    })

    expect(result.error).toBeUndefined()
    expect(productUpdate).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith('adjust_product_stock', expect.objectContaining({
      p_product_id: 'product-1',
      p_variant_name: '',
      p_delta: 5,
      p_unit_cost: 20,
    }))
  })

  it('blocks readonly role', async () => {
    mockContext('readonly')

    const result = await adjustStock('product-1', { type: 'restock', quantity: 1 })

    expect(result.error).toBeDefined()
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })
})
