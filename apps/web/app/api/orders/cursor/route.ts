import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-context'
import { createServerClient } from '@/lib/supabase/server'
import { decodeOrderCursor, encodeOrderCursor, parseIsoDate } from '@/lib/order-cursor'
import type { OrderStatus } from '@hanut/types'

const VALID_STATUSES = new Set<OrderStatus | 'all'>([
  'all', 'pending', 'new', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled',
])
type CursorRow = Record<string, unknown> & {
  id: string
  created_at: string
}

// Keyset pagination uses created_at + id so rows sharing the same timestamp
// cannot be skipped or duplicated between pages.
export async function GET(request: NextRequest) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const sp = request.nextUrl.searchParams
  const rawCursor = sp.get('cursor')
  const rawStatus = sp.get('status') ?? 'all'
  const rawDirection = sp.get('direction') ?? 'next'
  const rawLimit = sp.get('limit') ?? '20'

  if (!VALID_STATUSES.has(rawStatus as OrderStatus | 'all')) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
  }
  if (rawDirection !== 'next' && rawDirection !== 'prev') {
    return NextResponse.json({ error: 'Direction invalide.' }, { status: 400 })
  }

  const parsedLimit = Number(rawLimit)
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    return NextResponse.json({ error: 'Limite invalide.' }, { status: 400 })
  }

  const cursor = rawCursor ? decodeOrderCursor(rawCursor) : null
  if (rawCursor && !cursor) {
    return NextResponse.json({ error: 'Curseur invalide.' }, { status: 400 })
  }

  let since: string | null
  let until: string | null
  try {
    since = parseIsoDate(sp.get('since'), 'Date de début')
    until = parseIsoDate(sp.get('until'), 'Date de fin')
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Période invalide.' },
      { status: 400 }
    )
  }
  if (since && until && since >= until) {
    return NextResponse.json({ error: 'La date de début doit précéder la date de fin.' }, { status: 400 })
  }

  const status = rawStatus as OrderStatus | 'all'
  const limit = Math.min(50, parsedLimit)
  const direction = cursor ? rawDirection : 'next'
  const ascending = direction === 'prev'
  const supabase = await createServerClient()

  let query = supabase
    .from('orders')
    .select(
      'id, cod_amount, status, variant, quantity, notes, created_at, updated_at,' +
      ' customer_address, customer_city, customer_governorate, customer_delegation,' +
      ' customer_landmark, customer_postal_code, delivery_notes, address_version,' +
      ' customer:customers(id, name, phone, address, city, customer_governorate, customer_city, customer_delegation, customer_address, customer_landmark, customer_postal_code, delivery_notes, address_version),' +
      ' product:products(id, name, price)'
    )
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)

  if (status !== 'all') query = query.eq('status', status)
  if (since) query = query.gte('created_at', since)
  if (until) query = query.lt('created_at', until)

  if (cursor) {
    const comparison = direction === 'next' ? 'lt' : 'gt'
    query = query.or(
      `created_at.${comparison}.${cursor.createdAt},` +
      `and(created_at.eq.${cursor.createdAt},id.${comparison}.${cursor.id})`
    )
  }

  const { data, error } = await query
    .order('created_at', { ascending })
    .order('id', { ascending })
    .limit(limit + 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as unknown as CursorRow[]
  const hasMore = rows.length > limit
  const pageInQueryOrder = hasMore ? rows.slice(0, limit) : rows
  const orders = direction === 'prev' ? [...pageInQueryOrder].reverse() : pageInQueryOrder
  const first = orders[0]
  const last = orders[orders.length - 1]

  const hasPrevious = orders.length > 0 && (direction === 'prev' ? hasMore : Boolean(cursor))
  const hasNext = orders.length > 0 && (direction === 'next' ? hasMore : Boolean(cursor))

  return NextResponse.json({
    orders,
    nextCursor: hasNext && last ? encodeOrderCursor({ createdAt: last.created_at, id: last.id }) : null,
    prevCursor: hasPrevious && first ? encodeOrderCursor({ createdAt: first.created_at, id: first.id }) : null,
    hasMore,
    hasNext,
    hasPrevious,
  })
}
