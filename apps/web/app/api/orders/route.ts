import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-context'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('search')?.trim() ?? ''
  if (search.length < 2) {
    return NextResponse.json({ error: 'Paramètre search requis (min 2 caractères)' }, { status: 400 })
  }

  // Retire les caractères qui casseraient la syntaxe du filtre PostgREST
  const safe = search.replace(/[,()]/g, '').slice(0, 100)
  if (safe.length < 2) return NextResponse.json({ orders: [] })

  const supabase = await createServerClient()

  // 1. Trouver les clients correspondants (nom ou téléphone)
  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .eq('seller_id', context.sellerId)
    .or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`)
    .limit(200)

  const customerIds = (customers ?? []).map(c => c.id)

  // 2. Récupérer les commandes : clients trouvés OU préfixe d'UUID casté côté SQL.
  const { data: orders, error } = await supabase.rpc('search_orders', {
    p_seller_id: context.sellerId,
    p_search: safe,
    p_customer_ids: customerIds,
    p_limit: 100,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ orders: orders ?? [] })
}
