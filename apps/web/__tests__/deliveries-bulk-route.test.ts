import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const serverMock = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}))

const contextMock = vi.hoisted(() => ({
  getUserContext: vi.fn(),
}))

const csrfMock = vi.hoisted(() => ({
  checkOrigin: vi.fn(() => true),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: serverMock.createServerClient,
}))

vi.mock('@/lib/get-context', () => ({
  getUserContext: contextMock.getUserContext,
}))

vi.mock('@/lib/csrf', () => ({
  checkOrigin: csrfMock.checkOrigin,
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

import { PATCH } from '../app/api/deliveries/bulk/route'

type DeliveryRow = {
  id: string
  delivery_type: 'self' | 'carrier'
  cod_collected: boolean
  cod_reversed: boolean
  order: { cod_amount: number }
}

function request(body: unknown) {
  return new NextRequest('https://hanut.test/api/deliveries/bulk', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      origin: 'https://hanut.test',
    },
    body: JSON.stringify(body),
  })
}

function mockContext(role: 'admin' | 'operator' | 'readonly' = 'admin') {
  contextMock.getUserContext.mockResolvedValue({
    userId: 'user-1',
    sellerId: 'seller-1',
    role,
    isSeller: true,
    plan: 'pro',
    demoExpired: false,
  })
}

function mockDeliveries(deliveries: DeliveryRow[]) {
  const query = {
    select: vi.fn(() => query),
    in: vi.fn().mockResolvedValue({ data: deliveries, error: null }),
  }
  const rpc = vi.fn().mockResolvedValue({ data: 'order-1', error: null })
  serverMock.createServerClient.mockResolvedValue({
    from: vi.fn(() => query),
    rpc,
  })
  return { rpc }
}

describe('PATCH /api/deliveries/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContext()
  })

  it('uses the personal-delivery RPC when collecting COD in bulk', async () => {
    const { rpc } = mockDeliveries([
      {
        id: 'self-1',
        delivery_type: 'self',
        cod_collected: false,
        cod_reversed: false,
        order: { cod_amount: 80 },
      },
      {
        id: 'carrier-1',
        delivery_type: 'carrier',
        cod_collected: false,
        cod_reversed: false,
        order: { cod_amount: 90 },
      },
    ])

    const response = await PATCH(request({
      ids: ['self-1', 'carrier-1'],
      action: 'cod_collected',
    }))

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenNthCalledWith(1, 'mark_self_delivery_complete', {
      p_seller_id: 'seller-1',
      p_user_id: 'user-1',
      p_delivery_id: 'self-1',
    })
    expect(rpc).toHaveBeenNthCalledWith(2, 'mark_delivery_cod_collected', {
      p_seller_id: 'seller-1',
      p_user_id: 'user-1',
      p_delivery_id: 'carrier-1',
    })
  })

  it('never creates a carrier reversal for a personal delivery', async () => {
    const { rpc } = mockDeliveries([
      {
        id: 'self-1',
        delivery_type: 'self',
        cod_collected: true,
        cod_reversed: false,
        order: { cod_amount: 80 },
      },
    ])

    const response = await PATCH(request({
      ids: ['self-1'],
      action: 'cod_reversed',
    }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.updated).toBe(0)
    expect(json.message).toContain('en personne')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('blocks operators from bulk COD reversal before opening a database client', async () => {
    mockContext('operator')

    const response = await PATCH(request({
      ids: ['carrier-1'],
      action: 'cod_reversed',
    }))
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.error).toBe('Action réservée aux admins.')
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
  })
})
