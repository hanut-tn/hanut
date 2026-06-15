import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-context'
import { createServerClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

type CodCountRow = { pending_reversal_count: unknown }

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers)
  const { allowed } = await checkRateLimit(ip, 'pending_cod_count', 120, 60).catch(() => ({ allowed: true }))
  if (!allowed) return NextResponse.json({ count: 0 }, { status: 429 })

  const context = await getUserContext()
  if (!context) return NextResponse.json({ count: 0 }, { status: 401 })
  if (context.role !== 'admin') {
    return NextResponse.json({ count: 0 }, { status: 403 })
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase
    .rpc('get_cod_summary', { p_seller_id: context.sellerId })
    .single()

  if (error) {
    Sentry.captureException(new Error(`get_cod_summary failed: ${error.message}`), {
      tags: { module: 'pending_cod_count' },
      extra: { sellerId: context.sellerId },
    })
    return NextResponse.json(
      { count: 0, error: 'Impossible de charger le compteur COD.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const row = data as CodCountRow | null
  const count = Number(row?.pending_reversal_count ?? 0)
  return NextResponse.json(
    { count: Number.isFinite(count) ? count : 0 },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
