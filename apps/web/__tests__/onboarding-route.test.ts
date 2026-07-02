import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const serverMock = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}))

const contextMock = vi.hoisted(() => ({
  getUserContext: vi.fn(),
}))

const cacheMock = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: serverMock.createServerClient,
}))

vi.mock('@/lib/get-context', () => ({
  getUserContext: contextMock.getUserContext,
}))

vi.mock('next/cache', () => ({
  revalidatePath: cacheMock.revalidatePath,
  revalidateTag: cacheMock.revalidateTag,
}))

import { PATCH } from '../app/api/onboarding/route'

type UpdatePayload = Record<string, unknown>

function jsonRequest(body: unknown) {
  return new Request('http://localhost:3000/api/onboarding', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

function mockContext(overrides: Record<string, unknown> | null = {}) {
  contextMock.getUserContext.mockResolvedValue(
    overrides === null
      ? null
      : {
          userId: 'seller-1',
          sellerId: 'seller-1',
          role: 'admin',
          isSeller: true,
          plan: 'starter',
          ...overrides,
        }
  )
}

function mockServerClient({
  steps = { product_added: false, link_copied: false, first_order: false },
  slug = 'my-boutique',
  selectError = null,
  updateError = null,
}: {
  steps?: Record<string, unknown>
  slug?: string | null
  selectError?: { message: string } | null
  updateError?: { message: string } | null
} = {}) {
  const selectQuery = {
    select: vi.fn(() => selectQuery),
    eq: vi.fn(() => selectQuery),
    single: vi.fn().mockResolvedValue({
      data: selectError ? null : { onboarding_steps: steps, slug },
      error: selectError,
    }),
  }

  const updateQuery = {
    eq: vi.fn().mockResolvedValue({ error: updateError }),
  }

  const from = vi.fn((table: string) => {
    if (table !== 'sellers') throw new Error(`Unexpected table: ${table}`)
    return {
      select: selectQuery.select,
      eq: selectQuery.eq,
      single: selectQuery.single,
      update: vi.fn((payload: UpdatePayload) => {
        updateQueryPayloads.push(payload)
        return updateQuery
      }),
    }
  })

  const updateQueryPayloads: UpdatePayload[] = []
  serverMock.createServerClient.mockResolvedValue({ from })

  return { from, selectQuery, updateQuery, updateQueryPayloads }
}

describe('PATCH /api/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires an authenticated seller owner', async () => {
    mockContext(null)

    const response = await PATCH(jsonRequest({ action: 'link_copied' }))

    expect(response.status).toBe(401)
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
  })

  it('rejects team members', async () => {
    mockContext({ isSeller: false, role: 'operator' })

    const response = await PATCH(jsonRequest({ action: 'link_copied' }))

    expect(response.status).toBe(403)
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
  })

  it('marks the public link as copied while preserving existing steps', async () => {
    mockContext()
    const { selectQuery, updateQuery, updateQueryPayloads } = mockServerClient({
      steps: { product_added: false, link_copied: false, first_order: true },
    })

    const response = await PATCH(jsonRequest({ action: 'link_copied' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(selectQuery.eq).toHaveBeenCalledWith('id', 'seller-1')
    expect(updateQueryPayloads).toEqual([
      {
        onboarding_steps: {
          product_added: false,
          link_copied: true,
          first_order: true,
        },
      },
    ])
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'seller-1')
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith('dashboard-seller-1')
  })

  it('marks the first order step as completed while preserving existing steps', async () => {
    mockContext()
    const { updateQuery, updateQueryPayloads } = mockServerClient({
      steps: { product_added: true, link_copied: true, first_order: false },
    })

    const response = await PATCH(jsonRequest({ action: 'first_order' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(updateQueryPayloads).toEqual([
      {
        onboarding_steps: {
          product_added: true,
          link_copied: true,
          first_order: true,
        },
      },
    ])
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'seller-1')
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(cacheMock.revalidateTag).toHaveBeenCalledWith('dashboard-seller-1')
  })

  it('rejects link_copied when seller has no slug', async () => {
    mockContext()
    mockServerClient({ slug: null })

    const response = await PATCH(jsonRequest({ action: 'link_copied' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('URL') })
  })

  it('surfaces Supabase update errors', async () => {
    mockContext()
    mockServerClient({ updateError: { message: 'RLS denied' } })

    const response = await PATCH(jsonRequest({ action: 'complete' }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'RLS denied' })
    expect(cacheMock.revalidatePath).not.toHaveBeenCalled()
    expect(cacheMock.revalidateTag).not.toHaveBeenCalled()
  })

  it('dismiss accepte une date valide à +7 jours', async () => {
    mockContext()
    const { updateQueryPayloads } = mockServerClient()
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const response = await PATCH(jsonRequest({ action: 'dismiss', until }))

    expect(response.status).toBe(200)
    expect(updateQueryPayloads).toEqual([{ onboarding_dismissed_until: until }])
  })

  it('dismiss rejette une date non parsable', async () => {
    mockContext()
    mockServerClient()

    const response = await PATCH(jsonRequest({ action: 'dismiss', until: 'pas-une-date' }))

    expect(response.status).toBe(400)
  })

  it('dismiss rejette une date passée', async () => {
    mockContext()
    mockServerClient()
    const until = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const response = await PATCH(jsonRequest({ action: 'dismiss', until }))

    expect(response.status).toBe(400)
  })

  it('dismiss rejette une date au-delà de 30 jours', async () => {
    mockContext()
    mockServerClient()
    const until = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    const response = await PATCH(jsonRequest({ action: 'dismiss', until }))

    expect(response.status).toBe(400)
  })
})
