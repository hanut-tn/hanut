import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'

// GET /api/activity?limit=20&offset=0&userId=xxx&actionType=xxx&days=7
export async function GET(request: NextRequest) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role !== 'admin') return NextResponse.json({ error: 'Réservé aux admins' }, { status: 403 })
  if (context.plan !== 'business') return NextResponse.json({ error: 'Disponible dans le plan Business' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20') || 20))
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0') || 0)
  const userId = searchParams.get('userId')
  const actionType = searchParams.get('actionType')
  const actionTypes = searchParams.get('actionTypes')?.split(',').map(v => v.trim()).filter(Boolean) ?? []
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') ?? '30') || 30))

  const serviceClient = createServiceClient()
  let query = serviceClient
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .eq('seller_id', context.sellerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (userId) query = query.eq('user_id', userId)
  if (actionTypes.length > 0) query = query.in('action_type', actionTypes)
  else if (actionType) query = query.eq('action_type', actionType)
  if (days > 0) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    query = query.gte('created_at', since.toISOString())
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs: data ?? [], total: count ?? 0 })
}

const ALLOWED_ACTION_TYPES = [
  'order_created', 'order_confirmed', 'order_status_changed',
  'order_deleted', 'order_restored', 'order_permanently_deleted',
  'product_created', 'product_updated', 'product_deleted', 'stock_adjusted',
  'customer_updated', 'customer_deleted',
  'delivery_created', 'delivery_deleted',
  'member_invited', 'member_removed', 'member_role_changed',
] as const

// POST /api/activity — réservé aux admins, action_type whitelist, seller_id forcé depuis contexte
export async function POST(request: NextRequest) {
  const context = await getUserContext()
  if (!context || context.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!ALLOWED_ACTION_TYPES.includes(body.action_type as typeof ALLOWED_ACTION_TYPES[number])) {
    return NextResponse.json({ error: "Type d'action non autorisé" }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  const { error } = await serviceClient.from('activity_logs').insert({
    seller_id: context.sellerId,           // toujours depuis le contexte
    user_id: context.userId,               // toujours depuis le contexte
    user_name: typeof body.user_name === 'string' ? body.user_name.slice(0, 100) : '',
    action_type: body.action_type,
    entity_type: typeof body.entity_type === 'string' ? body.entity_type : null,
    entity_id: typeof body.entity_id === 'string' ? body.entity_id : null,
    description: typeof body.description === 'string' ? body.description.slice(0, 200) : null,
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
