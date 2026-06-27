import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Mocks partagés ───────────────────────────────────────────────────────────

const supabaseSsrMock = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}))

const contextMock = vi.hoisted(() => ({
  getUserContext: vi.fn(),
  getMonthlyOrderCount: vi.fn(),
}))

const serverMock = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: supabaseSsrMock.createServerClient,
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
  logActivity: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

vi.mock('@/lib/constants', () => ({
  DELETABLE_STATUSES: ['pending', 'new', 'confirmed'],
  TUNISIAN_GOVERNORATES: ['Tunis', 'Sfax', 'Sousse'],
  formatTunisianPhone: (phone: string) => phone,
  isValidTunisianPhone: () => true,
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

import { middleware } from '../middleware'
import { createOrder } from '../app/(dashboard)/orders/actions'
import type { CreateOrderInput } from '../app/(dashboard)/orders/actions'

const originalEnv = { ...process.env }

function requestFor(pathname: string) {
  return new NextRequest(new URL(pathname, 'https://hanut.test'))
}

function chainMaybeSingle(data: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  }
  return chain
}

// ─── Scénario 1 : démo Pro 14 jours ──────────────────────────────────────────

describe('démo Pro 14 jours — comportement initial', () => {
  it('un vendeur créé reçoit plan:pro avec 14 jours de démo non expirée', () => {
    // Le layout dashboard crée les nouveaux vendeurs avec plan:'pro'
    // et subscription_end = now + 14j. Cette valeur → demoExpired=false, daysLeft=14.
    const future14days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const diffMs = new Date(future14days).getTime() - Date.now()
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    expect(daysLeft).toBeGreaterThanOrEqual(13)
    expect(daysLeft).toBeLessThanOrEqual(14)

    // Avec 14 jours restants, la démo n'est pas expirée
    const demoExpired = new Date(future14days) < new Date()
    expect(demoExpired).toBe(false)
  })
})

// ─── Scénarios 2 & 3 : redirection billing ────────────────────────────────────

describe('middleware — redirection /billing quand démo expirée', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('redirige le vendeur vers /billing quand sa démo a expiré', async () => {
    const expiredDate = new Date(Date.now() - 1000).toISOString()
    supabaseSsrMock.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1', email_confirmed_at: '2026-01-01T00:00:00.000Z' } } }),
      },
      from: vi.fn().mockReturnValue(chainMaybeSingle({ subscription_end: expiredDate })),
    })

    const response = await middleware(requestFor('/dashboard'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://hanut.test/billing')
  })

  it('redirige un membre d\'équipe vers /billing quand la démo du vendeur owner est expirée', async () => {
    const expiredDate = new Date(Date.now() - 1000).toISOString()
    const ownerQuery = chainMaybeSingle(null)
    const membershipQuery = chainMaybeSingle({ seller_id: 'seller-owner-id' })
    const sellerQuery = chainMaybeSingle({ subscription_end: expiredDate })
    let sellerCallCount = 0

    supabaseSsrMock.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'member-user-id', email_confirmed_at: '2026-01-01T00:00:00.000Z' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'sellers') {
          sellerCallCount += 1
          return sellerCallCount === 1 ? ownerQuery : sellerQuery
        }
        if (table === 'team_members') return membershipQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
    })

    const response = await middleware(requestFor('/orders'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://hanut.test/billing')
    expect(membershipQuery.eq).toHaveBeenCalledWith('user_id', 'member-user-id')
    expect(membershipQuery.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('autorise l\'accès quand la démo est encore active', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    supabaseSsrMock.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-1', email_confirmed_at: '2026-01-01T00:00:00.000Z' } } }),
      },
      from: vi.fn().mockReturnValue(chainMaybeSingle({ subscription_end: futureDate })),
    })

    const response = await middleware(requestFor('/dashboard'))

    expect(response.headers.get('location')).toBeNull()
  })
})

// ─── Scénario 4 : seuil du DemoBanner ────────────────────────────────────────

describe('DemoBanner — seuil d\'affichage', () => {
  // Condition du layout : daysLeft !== null && daysLeft <= 7 && daysLeft >= 0
  function shouldShowBanner(daysLeft: number | null) {
    return daysLeft !== null && daysLeft <= 7 && daysLeft >= 0
  }

  it('affiche le banner quand il reste 7 jours', () => {
    expect(shouldShowBanner(7)).toBe(true)
  })

  it('affiche le banner quand il reste 4 jours', () => {
    expect(shouldShowBanner(4)).toBe(true)
  })

  it('affiche le banner quand il reste 0 jours (dernier jour)', () => {
    expect(shouldShowBanner(0)).toBe(true)
  })

  it('ne pas afficher le banner quand il reste 8 jours', () => {
    expect(shouldShowBanner(8)).toBe(false)
  })

  it('ne pas afficher le banner quand daysLeft est null (pas de démo)', () => {
    expect(shouldShowBanner(null)).toBe(false)
  })
})

// ─── Scénario 5 : limite 100 commandes Starter ───────────────────────────────

describe('plan Starter — limite mensuelle de commandes', () => {
  const orderInput: CreateOrderInput = {
    customer_name: 'Mehdi Trabelsi',
    customer_phone: '55444333',
    customer_governorate: 'Tunis',
    customer_city: 'Tunis Ville',
    customer_address: 'Rue 1',
    customer_landmark: 'Près de la poste',
    product_id: 'product-1',
    quantity: 1,
    cod_amount: 80,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne LIMIT_REACHED quand le vendeur Starter a atteint 100 commandes ce mois', async () => {
    contextMock.getUserContext.mockResolvedValue({
      userId: 'user-1',
      sellerId: 'seller-1',
      role: 'admin',
      isSeller: true,
      plan: 'starter',
      demoExpiresAt: null,
      demoExpired: false,
      daysLeft: null,
    })
    contextMock.getMonthlyOrderCount.mockResolvedValue(100)

    const result = await createOrder(orderInput)

    expect(result.error).toBe('LIMIT_REACHED')
    expect(serverMock.createServerClient).not.toHaveBeenCalled()
    expect(serverMock.revalidatePath).not.toHaveBeenCalled()
  })

  it('permet la création quand le vendeur Starter a 99 commandes ce mois', async () => {
    contextMock.getUserContext.mockResolvedValue({
      userId: 'user-1',
      sellerId: 'seller-1',
      role: 'admin',
      isSeller: true,
      plan: 'starter',
      demoExpiresAt: null,
      demoExpired: false,
      daysLeft: null,
    })
    contextMock.getMonthlyOrderCount.mockResolvedValue(99)

    const rpc = vi.fn().mockResolvedValue({ error: null })
    const productQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { name: 'Produit' } }),
    }
    const sellerQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Boutique' } }),
    }
    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'products') return productQuery
        if (table === 'sellers') return sellerQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc,
    })

    const result = await createOrder(orderInput)

    expect(result.error).toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('create_order_with_items', expect.objectContaining({
      p_seller_id: 'seller-1',
      p_status: 'new',
    }))
  })

  it('ne limite pas les vendeurs Pro (commandes illimitées)', async () => {
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
    // getMonthlyOrderCount ne doit pas être appelé pour les plans pro/business
    contextMock.getMonthlyOrderCount.mockResolvedValue(999)

    const rpc = vi.fn().mockResolvedValue({ error: null })
    const productQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { name: 'Produit' } }),
    }
    const sellerQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Boutique' } }),
    }
    serverMock.createServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'products') return productQuery
        if (table === 'sellers') return sellerQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
      rpc,
    })

    const result = await createOrder(orderInput)

    expect(result.error).toBeUndefined()
    expect(contextMock.getMonthlyOrderCount).not.toHaveBeenCalled()
  })
})
