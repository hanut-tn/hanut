import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-context'
import { createServerClient } from '@/lib/supabase/server'
import { escapeLikePattern } from '@/lib/utils'

type SortBy = 'name' | 'total_spent' | 'order_count' | 'last_order'

export async function GET(req: NextRequest) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const params = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(params.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(10, parseInt(params.get('limit') ?? '20')))
  const search = params.get('search')?.trim() ?? ''
  const sortByParam = params.get('sortBy')
  const sortBy: SortBy =
    sortByParam === 'total_spent' || sortByParam === 'order_count' || sortByParam === 'last_order'
      ? sortByParam
      : 'name'

  const from = (page - 1) * limit

  const supabase = await createServerClient()

  const sortConfig: { column: string; ascending: boolean; nullsFirst?: boolean } = (() => {
    switch (sortBy) {
      case 'total_spent': return { column: 'total_spent_calc', ascending: false, nullsFirst: false }
      case 'order_count': return { column: 'order_count',      ascending: false, nullsFirst: false }
      case 'last_order':  return { column: 'last_order_at',    ascending: false, nullsFirst: false }
      default:            return { column: 'name',             ascending: true }
    }
  })()

  let query = supabase
    .from('customers_with_stats')
    .select('id, name, phone, address, city, created_at, tags, order_count, total_spent_calc, last_order_at', { count: 'exact' })
    .eq('seller_id', context.sellerId)
    .order(sortConfig.column, { ascending: sortConfig.ascending, nullsFirst: sortConfig.nullsFirst })
    .order('name', { ascending: true })
    .range(from, from + limit - 1)

  const safeSearch = escapeLikePattern(search.replace(/[,()]/g, '').slice(0, 100))
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
