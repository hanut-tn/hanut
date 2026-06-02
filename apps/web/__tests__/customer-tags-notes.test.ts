import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'

const serverMock = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: serverMock.createServerClient,
}))

import { PUT } from '../app/api/customers/[id]/route'

type UpdateChain = {
  update: Mock
  eq: Mock
  error: { message: string } | null
}

function jsonRequest(body: unknown) {
  return new Request('https://hanut.test/api/customers/customer-1', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createUpdateChain(error: { message: string } | null = null): UpdateChain {
  const chain = {} as UpdateChain
  chain.update = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.error = error
  return chain
}

function mockServerClient(userId: string | null, chain = createUpdateChain()) {
  const getUser = vi.fn().mockResolvedValue({
    data: {
      user: userId ? { id: userId } : null,
    },
  })
  const from = vi.fn((table: string) => {
    if (table !== 'customers') throw new Error(`Unexpected table: ${table}`)
    return chain
  })

  serverMock.createServerClient.mockResolvedValue({
    auth: { getUser },
    from,
  })

  return { chain, from, getUser }
}

describe('customer tags and notes API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires auth before updating customer metadata', async () => {
    const { from } = mockServerClient(null)

    const response = await PUT(jsonRequest({ tags: ['VIP'] }), {
      params: Promise.resolve({ id: 'customer-1' }),
    })

    expect(response.status).toBe(401)
    expect(from).not.toHaveBeenCalled()
  })

  it('updates tags and notes scoped to the current seller', async () => {
    const { chain } = mockServerClient('seller-1')

    const response = await PUT(jsonRequest({
      tags: ['VIP', 'retour rapide'],
      notes: 'Prefere etre appelee le matin',
    }), {
      params: Promise.resolve({ id: 'customer-1' }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(chain.update).toHaveBeenCalledWith({
      tags: ['VIP', 'retour rapide'],
      notes: 'Prefere etre appelee le matin',
    })
    expect(chain.eq).toHaveBeenNthCalledWith(1, 'id', 'customer-1')
    expect(chain.eq).toHaveBeenNthCalledWith(2, 'seller_id', 'seller-1')
  })

  it('rejects empty customer metadata updates', async () => {
    const { chain } = mockServerClient('seller-1')

    const response = await PUT(jsonRequest({ name: 'Ignored' }), {
      params: Promise.resolve({ id: 'customer-1' }),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Aucune donnée à mettre à jour' })
    expect(chain.update).not.toHaveBeenCalled()
  })
})
