import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-context'
import { createServiceClient } from '@/lib/supabase/service'
import { checkOrigin } from '@/lib/csrf'

const VALID_REQUESTED_PLANS = ['pro'] as const

export async function POST(req: NextRequest) {
  if (!checkOrigin(req)) {
    return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403 })
  }

  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!context.isSeller) return NextResponse.json({ error: 'Réservé au propriétaire' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })

  const { requested_plan } = body
  if (!VALID_REQUESTED_PLANS.includes(requested_plan)) {
    return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('upgrade_requests').insert({
    seller_id: context.sellerId,
    current_plan: context.plan,
    requested_plan,
  })

  if (error) {
    console.error('[upgrade-requests] insert failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!context.isSeller) return NextResponse.json({ error: 'Réservé au propriétaire' }, { status: 403 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('upgrade_requests')
    .select('id, requested_plan, current_plan, status, whatsapp_opened_at, created_at')
    .eq('seller_id', context.sellerId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}
