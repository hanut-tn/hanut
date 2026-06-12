import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-context'
import { createServerClient } from '@/lib/supabase/server'

type SortBy = 'name' | 'total_spent' | 'order_count' | 'last_order'
type CustomerStatsRow = {
  id: string
  order_count: number | null
  total_spent_calc: number | null
  last_order_at: string | null
}

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
  const to = from + limit - 1

  const supabase = await createServerClient()

  const sortConfig: { column: string; ascending: boolean; nullsFirst?: boolean } = (() => {
    switch (sortBy) {
      case 'total_spent': return { column: 'total_spent_calc', ascending: false, nullsFirst: false }
      case 'order_count': return { column: 'order_count',      ascending: false, nullsFirst: false }
      case 'last_order':  return { column: 'last_order_at',    ascending: false, nullsFirst: false }
      default:            return { column: 'name',             ascending: true }
    }
  })()

  let statsQuery = supabase
    .from('customers_with_stats')
    .select('id, order_count, total_spent_calc, last_order_at', { count: 'exact' })
    .eq('seller_id', context.sellerId)
    .order(sortConfig.column, { ascending: sortConfig.ascending, nullsFirst: sortConfig.nullsFirst })
    .order('name', { ascending: true })
    .range(from, to)

  const safeSearch = search.replace(/[,()]/g, '').slice(0, 100)
  if (safeSearch.length >= 2) {
    statsQuery = statsQuery.or(`name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`)
  }

  const { data: statsRows, count, error } = await statsQuery as unknown as {
    data: CustomerStatsRow[] | null
    count: number | null
    error: { message: string } | null
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (statsRows ?? []).map(row => row.id)
  if (ids.length === 0) {
    return NextResponse.json({ customers: [], total: count ?? 0, page, limit, hasMore: false })
  }

  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id, name, phone, address, city, created_at, tags, order_count')
    .eq('seller_id', context.sellerId)
    .in('id', ids)

  if (customersError) return NextResponse.json({ error: customersError.message }, { status: 500 })

  const statsById = new Map((statsRows ?? []).map(row => [row.id, row]))
  const customerById = new Map((customers ?? []).map(customer => [customer.id, customer]))
  const sortedCustomers = ids
    .map(id => {
      const customer = customerById.get(id)
      const stats = statsById.get(id)
      return customer && stats ? { ...customer, ...stats } : customer
    })
    .filter(Boolean)

  const total = count ?? 0
  return NextResponse.json({
    customers: sortedCustomers,
    total,
    page,
    limit,
    hasMore: from + ids.length < total,
  })
}
