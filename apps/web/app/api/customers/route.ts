import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''

  const context = await getUserContext()
  if (!context) return NextResponse.json([], { status: 401 })

  const supabase = await createServerClient()

  if (search.length < 2) return NextResponse.json([])

  const { data } = await supabase
    .from('customers')
    .select('id, name, phone, city, address')
    .eq('seller_id', context.sellerId)
    .or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    .order('name')
    .limit(8)

  return NextResponse.json(data ?? [])
}
