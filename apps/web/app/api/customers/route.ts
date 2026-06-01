import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  if (search.length < 2) return NextResponse.json([])

  const { data } = await supabase
    .from('customers')
    .select('id, name, phone, city, address')
    .eq('seller_id', user.id)
    .or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    .order('name')
    .limit(8)

  return NextResponse.json(data ?? [])
}
