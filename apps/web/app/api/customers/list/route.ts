import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-context'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const params = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(params.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(10, parseInt(params.get('limit') ?? '20')))
  const search = params.get('search')?.trim() ?? ''

  const from = (page - 1) * limit
  const to = from + limit - 1

  const supabase = await createServerClient()

  let query = supabase
    .from('customers')
    .select(
      'id, name, phone, address, city, created_at, tags, orders(id, cod_amount, status, created_at)',
      { count: 'exact' }
    )
    .eq('seller_id', context.sellerId)
    .is('orders.deleted_at', null)
    .order('name', { ascending: true })
    .range(from, to)

  const safeSearch = search.replace(/[,()]/g, '').slice(0, 100)
  if (safeSearch.length >= 2) {
    query = query.or(`name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`)
  }

  const { data: customers, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = count ?? 0
  return NextResponse.json({
    customers: customers ?? [],
    total,
    page,
    limit,
    hasMore: from + (customers?.length ?? 0) < total,
  })
}
