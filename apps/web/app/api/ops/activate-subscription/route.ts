import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase/service'

const OPS_SECRET = process.env.OPS_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (!OPS_SECRET || auth !== `Bearer ${OPS_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { seller_id?: string; plan?: string; months?: number; activated_by?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { seller_id, plan, months = 1, activated_by = 'webhook:ops' } = body

  if (!seller_id || typeof seller_id !== 'string') {
    return NextResponse.json({ error: 'seller_id is required' }, { status: 400 })
  }
  // Plan Business non encore disponible — retiré jusqu'à implémentation complète.
  if (!plan || !['starter', 'pro'].includes(plan)) {
    return NextResponse.json({ error: 'plan must be starter or pro' }, { status: 400 })
  }
  if (typeof months !== 'number' || months < 1 || months > 24) {
    return NextResponse.json({ error: 'months must be between 1 and 24' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Passe par la RPC pour : log activity_logs, cycle 30 jours exact,
  // upgrade_requests marqué activated, validation cohérente avec le reste.
  const { data, error } = await supabase.rpc('activate_paid_subscription', {
    p_seller_id:     seller_id,
    p_plan:          plan,
    p_duration_days: months * 30, // 1 mois = 30 jours calendaires (convention interne)

    p_activated_by:  activated_by,
  })

  if (error) {
    Sentry.captureException(new Error(`activate_paid_subscription failed: ${error.message}`), {
      tags: { module: 'ops_billing' },
      extra: { seller_id, plan, months },
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const result = data as {
    seller_id: string
    plan: string
    subscription_status: string
    subscription_end: string
    previous_subscription_end: string | null
    upgrade_request_activated: boolean
  }

  return NextResponse.json({
    ok: true,
    seller_id: result.seller_id,
    plan: result.plan,
    subscription_end: result.subscription_end,
    previous_subscription_end: result.previous_subscription_end,
    upgrade_request_activated: result.upgrade_request_activated,
  })
}
