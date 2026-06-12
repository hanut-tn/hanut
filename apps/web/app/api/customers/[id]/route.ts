import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { checkOrigin } from '@/lib/csrf'

const UpdateCustomerTagsSchema = z.object({
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  notes: z.string().max(2000).optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10')))
  const offset = (page - 1) * limit

  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = await createServerClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, phone, address, city, created_at, tags, notes')
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .single()

  if (!customer) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  // Paginated orders for display
  const { data: orders, count: totalOrders } = await supabase
    .from('orders')
    .select('id, cod_amount, status, variant, quantity, created_at, product:products(id, name)', { count: 'exact' })
    .eq('customer_id', id)
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const orderList = orders ?? []
  const total = totalOrders ?? 0
  const hasMore = offset + orderList.length < total

  // Stats calculées côté serveur via RPC — plus de chargement illimité en mémoire
  if (page === 1) {
    const { data: statsRaw, error: statsError } = await supabase.rpc('get_customer_stats', {
      p_customer_id: id,
      p_seller_id: context.sellerId,
    })
    if (statsError) {
      return NextResponse.json({ error: statsError.message }, { status: 500 })
    }

    const stats = (statsRaw ?? {}) as {
      total_spent: number
      order_count: number
      delivered_count: number
      returned_count: number
      cancelled_count: number
      delivery_rate: number
      favorite_product: string | null
      last_order_at: string | null
    }

    return NextResponse.json({
      customer,
      orders: orderList,
      totalOrders: total,
      hasMore,
      stats: {
        total_spent: stats.total_spent ?? 0,
        order_count: stats.order_count ?? 0,
        delivery_rate: stats.delivery_rate ?? 0,
        favorite_product: stats.favorite_product ?? null,
      },
    })
  }

  return NextResponse.json({ orders: orderList, totalOrders: total, hasMore })
}

export async function PUT(req: Request, { params }: Params) {
  if (!checkOrigin(req)) return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403 })
  const { id } = await params
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role === 'readonly') {
    return NextResponse.json({ error: 'Action réservée aux admins et opérateurs' }, { status: 403 })
  }

  const supabase = await createServerClient()

  const rawBody = await req.json().catch(() => null)
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = UpdateCustomerTagsSchema.safeParse(rawBody)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Données invalides'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const body = parsed.data

  // Bloquer les modifications tags/notes pour le plan Starter
  if (context.plan === 'starter' && ('tags' in body || 'notes' in body)) {
    return NextResponse.json({ error: 'PLAN_REQUIRED' }, { status: 403 })
  }

  const update: Record<string, unknown> = {}
  if ('tags' in body) update.tags = body.tags
  if ('notes' in body) update.notes = body.notes

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
  }

  const { error } = await supabase
    .from('customers')
    .update(update)
    .eq('id', id)
    .eq('seller_id', context.sellerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
