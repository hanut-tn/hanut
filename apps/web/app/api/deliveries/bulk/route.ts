import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'

const BulkDeliverySchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Aucune livraison sélectionnée').max(100, 'Maximum 100 livraisons à la fois'),
  action: z.enum(['cod_collected', 'cod_reversed']),
})

export async function PATCH(req: Request) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role === 'readonly') return NextResponse.json({ error: 'Action réservée aux admins et opérateurs' }, { status: 403 })

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = BulkDeliverySchema.safeParse(rawBody)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Données invalides'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { ids, action } = parsed.data

  const supabase = await createServerClient()

  // RLS garantit que seules les livraisons du vendeur connecté sont retournées
  type DeliveryRow = { id: string; cod_collected: boolean; cod_reversed: boolean }
  const { data: deliveries, error: fetchError } = await supabase
    .from('deliveries')
    .select('id, cod_collected, cod_reversed')
    .in('id', ids) as unknown as { data: DeliveryRow[] | null; error: unknown }

  if (fetchError) return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
  if (!deliveries || deliveries.length === 0) {
    return NextResponse.json({ error: 'Aucune livraison trouvée' }, { status: 404 })
  }

  let toUpdate: string[]
  let skipped: number

  if (action === 'cod_collected') {
    const notYet = deliveries.filter(d => !d.cod_collected)
    skipped = deliveries.length - notYet.length
    toUpdate = notYet.map(d => d.id)
  } else {
    const notYet = deliveries.filter(d => !d.cod_reversed)
    skipped = deliveries.length - notYet.length
    toUpdate = notYet.map(d => d.id)
  }

  if (toUpdate.length === 0) {
    return NextResponse.json({ updated: 0, skipped: deliveries.length })
  }

  const patch =
    action === 'cod_collected'
      ? { cod_collected: true, delivered_at: new Date().toISOString() }
      : { cod_collected: true, cod_reversed: true, delivered_at: new Date().toISOString() }

  const { error: updateError } = await supabase
    .from('deliveries')
    .update(patch)
    .in('id', toUpdate)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ updated: toUpdate.length, skipped })
}
