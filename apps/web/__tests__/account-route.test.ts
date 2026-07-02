import { beforeEach, describe, expect, it, vi } from 'vitest'

const serviceMock = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}))

const contextMock = vi.hoisted(() => ({
  getUserContext: vi.fn(),
}))

const csrfMock = vi.hoisted(() => ({
  checkOrigin: vi.fn(() => true),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: serviceMock.createServiceClient,
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

import { DELETE } from '../app/api/account/route'

function deleteRequest(body: unknown) {
  return new Request('http://localhost:3000/api/account', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockContext(overrides: Record<string, unknown> | null = {}) {
  contextMock.getUserContext.mockResolvedValue(
    overrides === null
      ? null
      : {
          userId: 'user-1',
          sellerId: 'seller-1',
          role: 'admin',
          isSeller: true,
          plan: 'pro',
          ...overrides,
        }
  )
}

function mockService({
  sellerEmail = 'yusuf@hanut.tn',
  sellerError = null,
  rpcError = null,
  authDeleteError = null,
}: {
  sellerEmail?: string | null
  sellerError?: { message: string } | null
  rpcError?: { message: string } | null
  authDeleteError?: { message: string } | null
} = {}) {
  const single = vi.fn().mockResolvedValue({
    data: sellerError ? null : { email: sellerEmail },
    error: sellerError,
  })
  const selectChain = { select: vi.fn(() => selectChain), eq: vi.fn(() => selectChain), single }
  const rpc = vi.fn().mockResolvedValue({ error: rpcError })
  const deleteUser = vi.fn().mockResolvedValue({ error: authDeleteError })

  serviceMock.createServiceClient.mockReturnValue({
    from: vi.fn(() => selectChain),
    rpc,
    auth: { admin: { deleteUser } },
  })

  return { rpc, deleteUser }
}

describe('DELETE /api/account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    csrfMock.checkOrigin.mockReturnValue(true)
  })

  it('rejette une origine non autorisée', async () => {
    csrfMock.checkOrigin.mockReturnValue(false)
    const response = await DELETE(deleteRequest({ email: 'yusuf@hanut.tn' }))
    expect(response.status).toBe(403)
    expect(contextMock.getUserContext).not.toHaveBeenCalled()
  })

  it('exige une authentification', async () => {
    mockContext(null)
    const response = await DELETE(deleteRequest({ email: 'yusuf@hanut.tn' }))
    expect(response.status).toBe(401)
  })

  it('refuse les membres d\'équipe (non-propriétaires)', async () => {
    mockContext({ isSeller: false, role: 'operator' })
    const response = await DELETE(deleteRequest({ email: 'yusuf@hanut.tn' }))
    expect(response.status).toBe(403)
  })

  it('exige l\'email de confirmation', async () => {
    mockContext()
    const response = await DELETE(deleteRequest({}))
    expect(response.status).toBe(400)
  })

  it('refuse un email de confirmation incorrect sans rien supprimer', async () => {
    mockContext()
    const { rpc, deleteUser } = mockService({ sellerEmail: 'yusuf@hanut.tn' })

    const response = await DELETE(deleteRequest({ email: 'autre@email.com' }))

    expect(response.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('accepte l\'email avec casse/espaces différents', async () => {
    mockContext()
    const { rpc } = mockService({ sellerEmail: 'Yusuf@Hanut.tn' })

    const response = await DELETE(deleteRequest({ email: '  YUSUF@hanut.tn ' }))

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('delete_seller_account', {
      p_seller_id: 'seller-1',
      p_user_id: 'user-1',
    })
  })

  it('supprime DB puis compte Auth dans cet ordre', async () => {
    mockContext()
    const { rpc, deleteUser } = mockService()

    const response = await DELETE(deleteRequest({ email: 'yusuf@hanut.tn' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(rpc).toHaveBeenCalled()
    expect(deleteUser).toHaveBeenCalledWith('user-1')
  })

  it('bloque la suppression si du COD est en attente', async () => {
    mockContext()
    const { deleteUser } = mockService({ rpcError: { message: 'cod_pending: 3 deliveries' } })

    const response = await DELETE(deleteRequest({ email: 'yusuf@hanut.tn' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('COD') })
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it('ne supprime pas le compte Auth si la RPC échoue', async () => {
    mockContext()
    const { deleteUser } = mockService({ rpcError: { message: 'boom' } })

    const response = await DELETE(deleteRequest({ email: 'yusuf@hanut.tn' }))

    expect(response.status).toBe(500)
    expect(deleteUser).not.toHaveBeenCalled()
  })
})
