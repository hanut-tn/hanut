import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-context'
import { createServerClient } from '@/lib/supabase/server'
import { escapeLikePattern } from '@/lib/utils'
import {
  decodeCustomerCursor,
  encodeCustomerCursor,
  getCustomerCursorValue,
  isCustomerSort,
  type CustomerSortBy,
} from '@/lib/customer-cursor'

export async function GET(req: NextRequest) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const params = req.nextUrl.searchParams
  const parsedLimit = Number.parseInt(params.get('limit') ?? '20', 10)
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(50, Math.max(1, parsedLimit))
    : 20
  const sortByParam = params.get('sortBy')
  const sortBy: CustomerSortBy = isCustomerSort(sortByParam) ? sortByParam : 'name'
  const search = params.get('search')?.trim() ?? ''
  const cursorStr = params.get('cursor')
  const cursor = cursorStr ? decodeCustomerCursor(cursorStr) : null

  if (cursorStr && (!cursor || cursor.s !== sortBy)) {
    return NextResponse.json({ error: 'Curseur invalide.' }, { status: 400 })
  }

  const safeSearch = search
    ? escapeLikePattern(search.replace(/[,()]/g, '').slice(0, 100))
    : null

  const supabase = await createServerClient()
  const { data: rows, error } = await supabase.rpc('get_customers_cursor_page', {
    p_seller_id: context.sellerId,
    p_sort_by: sortBy,
    p_limit: limit,
    p_cursor_value: cursor?.v ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_search: safeSearch && safeSearch.length >= 2 ? safeSearch : null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all = rows ?? []
  const hasMore = all.length > limit
  const customers = hasMore ? all.slice(0, limit) : all

  let nextCursor: string | null = null
  if (hasMore && customers.length > 0) {
    const last = customers[customers.length - 1]
    nextCursor = encodeCustomerCursor({
      v: getCustomerCursorValue(last, sortBy),
      id: last.id,
      s: sortBy,
    })
  }

  return NextResponse.json({ customers, nextCursor, hasMore })
}
