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
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const userId = searchParams.get('userId')
  const actionType = searchParams.get('actionType')
  const actionTypes = searchParams.get('actionTypes')?.split(',').map(v => v.trim()).filter(Boolean) ?? []
  const days = parseInt(searchParams.get('days') ?? '0')

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

// POST /api/activity — créer une entrée (interne, appelée par logActivity)
export async function POST(request: NextRequest) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const serviceClient = createServiceClient()

  const { error } = await serviceClient.from('activity_logs').insert({
    seller_id: context.sellerId,
    user_id: body.user_id ?? context.userId,
    user_name: body.user_name ?? '',
    action_type: body.action_type,
    entity_type: body.entity_type ?? null,
    entity_id: body.entity_id ?? null,
    description: body.description,
    metadata: body.metadata ?? {},
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
