import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-context'
import { createServerClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers)
  // Polling toutes les 60 s + chargements/navigation : garder une marge
  // suffisante pour éviter un 429 lors du 61e appel de la fenêtre.
  const { allowed } = await checkRateLimit(ip, 'pending_count', 120, 60).catch(() => ({ allowed: true }))
  if (!allowed) return NextResponse.json({ count: 0 }, { status: 429 })

  const context = await getUserContext()
  if (!context) return NextResponse.json({ count: 0 }, { status: 401 })

  const supabase = await createServerClient()
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', context.sellerId)
    .in('status', ['pending', 'new'])
    .is('deleted_at', null)

  return NextResponse.json({ count: count ?? 0 })
}
