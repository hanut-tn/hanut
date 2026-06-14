import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { escapeLikePattern } from '@/lib/utils'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const sortBy = searchParams.get('sortBy') ?? 'name'

  const context = await getUserContext()
  if (!context) return NextResponse.json([], { status: 401 })

  const supabase = await createServerClient()

  const safeSearch = escapeLikePattern(search.replace(/[,()]/g, '').slice(0, 100))
  if (safeSearch.length < 2) return NextResponse.json([])

  // Computed sorts (total_spent, order_count, last_order) are handled client-side.
  // For this search autocomplete route, only name ordering applies.
  const ascending = sortBy === 'name'
  const orderCol = 'name'

  const { data } = await supabase
    .from('customers')
    .select('id, name, phone, city, address')
    .eq('seller_id', context.sellerId)
    .or(`name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`)
    .order(orderCol, { ascending })
    .limit(8)

  return NextResponse.json(data ?? [])
}
