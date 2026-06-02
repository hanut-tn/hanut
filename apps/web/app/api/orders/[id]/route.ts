import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role === 'readonly') {
    return NextResponse.json({ error: 'Action réservée aux admins et opérateurs' }, { status: 403 })
  }

  const supabase = await createServerClient()

  const body = await req.json()
  const update: Record<string, unknown> = {}
  if ('customer_id' in body) update.customer_id = body.customer_id

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
  }

  const { error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', id)
    .eq('seller_id', context.sellerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
