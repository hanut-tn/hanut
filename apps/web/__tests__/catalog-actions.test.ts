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

function makeUpdateChain(capturedUpdate: { value?: Record<string, unknown> }) {
  const chain = {
    update: vi.fn((payload: Record<string, unknown>) => {
      capturedUpdate.value = payload
      return chain
    }),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null }),
  }
  return chain
}

describe('adjustStock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContext()
  })

  it('sends only variants (no stock) when adjusting a variant product', async () => {
    const captured: { value?: Record<string, unknown> } = {}
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
    const stockMovements = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    }
    const updateChain = makeUpdateChain(captured)

    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'products') {
          return { ...productQuery, update: updateChain.update }
        }
        if (table === 'sellers') return sellerQuery
        if (table === 'stock_movements') return stockMovements
        throw new Error(`Unexpected table: ${table}`)
      }),
    })

    const result = await adjustStock('product-1', {
      type: 'restock',
      quantity: 2,
      variantAdjustments: [{ label: 'S', value: 2 }],
    })

    expect(result.error).toBeUndefined()
    // Trigger handles stock sync — only variants sent in the update
    expect(captured.value).toBeDefined()
    expect(captured.value).toHaveProperty('variants')
    expect(captured.value).not.toHaveProperty('stock')
    const updatedVariants = captured.value!.variants as { size: string; qty: number }[]
    const sVariant = updatedVariants.find(v => v.size === 'S')
    expect(sVariant?.qty).toBe(5)
  })

  it('recalculates WAC on restock with costUpdateMode=wac', async () => {
    const captured: { value?: Record<string, unknown> } = {}
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
    const stockMovements = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    }
    const updateChain = makeUpdateChain(captured)

    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'products') {
          return { ...productQuery, update: updateChain.update }
        }
        if (table === 'sellers') return sellerQuery
        if (table === 'stock_movements') return stockMovements
        throw new Error(`Unexpected table: ${table}`)
      }),
    })

    const result = await adjustStock('product-1', {
      type: 'restock',
      quantity: 5,
      unitCost: 20,
      costUpdateMode: 'wac',
    })

    expect(result.error).toBeUndefined()
    // WAC = (5×10 + 5×20) / 10 = 15
    expect(captured.value?.cost).toBe(15)
    expect(captured.value?.stock).toBe(10)
  })

  it('blocks readonly role', async () => {
    mockContext('readonly')

    const result = await adjustStock('product-1', { type: 'restock', quantity: 1 })

    expect(result.error).toBeDefined()
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })
})
