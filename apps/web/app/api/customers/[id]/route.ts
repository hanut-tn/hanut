import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'

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

  // Stats require all orders — only compute on first page load
  if (page === 1) {
    const { data: allOrders } = await supabase
      .from('orders')
      .select('id, cod_amount, status, product:products(id, name)')
      .eq('customer_id', id)
      .eq('seller_id', context.sellerId)
      .is('deleted_at', null)

    const all = allOrders ?? []
    const delivered = all.filter(o => o.status === 'delivered')
    const total_spent = delivered.reduce((s: number, o: { cod_amount: number }) => s + o.cod_amount, 0)
    const order_count = all.length
    const delivery_rate = order_count > 0 ? Math.round((delivered.length / order_count) * 100) : 0

    const productCounts: Record<string, { name: string; count: number }> = {}
    for (const o of all) {
      const p = Array.isArray(o.product) ? o.product[0] : o.product
      if (p) {
        if (!productCounts[(p as { id: string }).id]) productCounts[(p as { id: string }).id] = { name: (p as { name: string }).name, count: 0 }
        productCounts[(p as { id: string }).id].count++
      }
    }
    const favorite_product = Object.values(productCounts).sort((a, b) => b.count - a.count)[0]?.name ?? null

    return NextResponse.json({
      customer,
      orders: orderList,
      totalOrders: total,
      hasMore,
      stats: { total_spent, order_count, delivery_rate, favorite_product },
    })
  }

  return NextResponse.json({ orders: orderList, totalOrders: total, hasMore })
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role === 'readonly') {
    return NextResponse.json({ error: 'Action réservée aux admins et opérateurs' }, { status: 403 })
  }

  const supabase = await createServerClient()

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

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
