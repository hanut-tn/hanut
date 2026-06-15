import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const serviceMock = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: serviceMock.createServiceClient,
}))

import { GET } from '../app/api/track/[orderId]/route'

describe('e2e: suivi après commande publique', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns tracking data without exposing the internal order UUID', async () => {
    const trackingToken = 'abcdef1234567890'
    serviceMock.createServiceClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'orders') return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'internal-uuid-ne-pas-exposer',
              status: 'pending',
              cod_amount: 60,
              variant: null,
              quantity: 1,
              created_at: new Date().toISOString(),
              customer: { name: 'Fatima Ben Ali', city: 'Tunis' },
              product: { name: 'Produit Test', image_url: null },
              seller: { phone: null },
            },
          }),
        }
        if (table === 'deliveries') return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }
        if (table === 'order_status_history') return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [] }),
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    })

    const request = new NextRequest(`https://hanut.test/api/track/${trackingToken}`)
    const response = await GET(request, {
      params: Promise.resolve({ orderId: trackingToken }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect('id' in data).toBe(false)
    expect('full_id' in data).toBe(false)
    expect(data.order_id).toBe(trackingToken.slice(0, 8).toUpperCase())
  })
})
