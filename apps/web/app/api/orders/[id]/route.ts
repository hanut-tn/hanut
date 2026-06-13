import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { checkOrigin } from '@/lib/csrf'
import { requireActiveResponse } from '@/lib/assert-active'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: Params) {
  if (!checkOrigin(req)) return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403 })
  const { id } = await params
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role === 'readonly') {
    return NextResponse.json({ error: 'Action réservée aux admins et opérateurs' }, { status: 403 })
  }
  const activeCheck = requireActiveResponse(context)
  if (activeCheck) return activeCheck

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const supabase = await createServerClient()

  const update: Record<string, unknown> = {}

  if ('customer_id' in body) {
    if (typeof body.customer_id !== 'string' || body.customer_id.trim() === '') {
      return NextResponse.json({ error: 'Client invalide.' }, { status: 400 })
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', body.customer_id.trim())
      .eq('seller_id', context.sellerId)
      .maybeSingle()

    if (!customer) {
      return NextResponse.json({ error: 'Client introuvable.' }, { status: 404 })
    }

    update.customer_id = body.customer_id.trim()
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
  }

  const { error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', id)
    .eq('seller_id', context.sellerId)
    .is('deleted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
