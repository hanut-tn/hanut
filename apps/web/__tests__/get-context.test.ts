import { beforeEach, describe, expect, it, vi } from 'vitest'

const serverMock = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}))

const serviceMock = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => serverMock)
vi.mock('@/lib/supabase/service', () => serviceMock)

import { getUserContext } from '@/lib/get-context'

function sellerQuery(seller: object | null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: seller }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}

function memberQuery(member: object | null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: member }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}

describe('getUserContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not turn a removed invited member into a Pro seller', async () => {
    const sellers = sellerQuery({
      id: 'invited-user',
      plan: 'pro',
      subscription_end: '2099-01-01T00:00:00.000Z',
    })
    const members = memberQuery(null)

    serverMock.createServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'invited-user',
              user_metadata: { invitation_token: 'original-invite-token' },
            },
          },
        }),
      },
      from: vi.fn(() => sellers),
    })
    serviceMock.createServiceClient.mockReturnValue({
      from: vi.fn(() => members),
    })

    await expect(getUserContext()).resolves.toBeNull()
  })

  it('keeps a regular seller as the owner of their shop', async () => {
    const sellers = sellerQuery({
      id: 'seller-1',
      plan: 'pro',
      subscription_end: null,
    })

    serverMock.createServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'seller-1',
              user_metadata: { name: 'Boutique' },
            },
          },
        }),
      },
      from: vi.fn(() => sellers),
    })

    await expect(getUserContext()).resolves.toMatchObject({
      userId: 'seller-1',
      sellerId: 'seller-1',
      role: 'admin',
      isSeller: true,
      plan: 'pro',
    })
  })
})
