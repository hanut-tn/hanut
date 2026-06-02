import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
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

  const { data: orders } = await supabase
    .from('orders')
    .select('id, cod_amount, status, variant, quantity, created_at, product:products(id, name)')
    .eq('customer_id', id)
    .eq('seller_id', context.sellerId)
    .order('created_at', { ascending: false })

  const orderList = orders ?? []
  const delivered = orderList.filter(o => o.status === 'delivered')
  const total_spent = delivered.reduce((s, o) => s + o.cod_amount, 0)
  const order_count = orderList.length
  const delivery_rate = order_count > 0 ? Math.round((delivered.length / order_count) * 100) : 0

  const productCounts: Record<string, { name: string; count: number }> = {}
  for (const o of orderList) {
    const p = Array.isArray(o.product) ? o.product[0] : o.product
    if (p) {
      if (!productCounts[p.id]) productCounts[p.id] = { name: p.name, count: 0 }
      productCounts[p.id].count++
    }
  }
  const favorite_product = Object.values(productCounts).sort((a, b) => b.count - a.count)[0]?.name ?? null

  return NextResponse.json({
    customer,
    orders: orderList,
    stats: { total_spent, order_count, delivery_rate, favorite_product },
  })
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role === 'readonly') {
    return NextResponse.json({ error: 'Action réservée aux admins et opérateurs' }, { status: 403 })
  }

  const supabase = await createServerClient()

  const body = await req.json()
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
