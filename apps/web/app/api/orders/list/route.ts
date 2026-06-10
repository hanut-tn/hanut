import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-context'
import { createServerClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@hanut/types'

const VALID_STATUSES: (OrderStatus | 'all')[] = [
  'all',
  'pending',
  'new',
  'confirmed',
  'shipped',
  'delivered',
  'returned',
  'cancelled',
]

export async function GET(req: NextRequest) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const params = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(params.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(10, parseInt(params.get('limit') ?? '20')))
  const rawStatus = params.get('status') ?? 'all'
  const status = VALID_STATUSES.includes(rawStatus as OrderStatus | 'all') ? rawStatus : 'all'
  const since = params.get('since')
  const until = params.get('until')

  const from = (page - 1) * limit
  const to = from + limit - 1

  const supabase = await createServerClient()

  let query = supabase
    .from('orders')
    .select(
      'id, cod_amount, status, variant, quantity, notes, created_at, customer:customers(id, name, phone, city), product:products(id, name, price)',
      { count: 'exact' }
    )
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status !== 'all') query = query.eq('status', status)
  if (since) query = query.gte('created_at', since)
  if (until) query = query.lt('created_at', until)

  const { data: orders, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = count ?? 0
  return NextResponse.json({
    orders: orders ?? [],
    total,
    page,
    limit,
    hasMore: from + (orders?.length ?? 0) < total,
  })
}
