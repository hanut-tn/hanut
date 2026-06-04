import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-context'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
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
