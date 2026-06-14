import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkOrigin } from '@/lib/csrf'
import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { requireActiveResponse } from '@/lib/assert-active'

const BulkDeliverySchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Aucune livraison sélectionnée').max(100, 'Maximum 100 livraisons à la fois'),
  action: z.enum(['cod_collected', 'cod_reversed']),
})

export async function PATCH(req: NextRequest) {
  if (!checkOrigin(req)) return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403 })
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (context.role === 'readonly') return NextResponse.json({ error: 'Action réservée aux admins et opérateurs' }, { status: 403 })
  const activeCheck = requireActiveResponse(context)
  if (activeCheck) return activeCheck

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
  type DeliveryRow = {
    id: string
    delivery_type: 'self' | 'carrier'
    cod_collected: boolean
    cod_reversed: boolean
    order: { cod_amount: number } | { cod_amount: number }[] | null
  }
  const { data: deliveries, error: fetchError } = await supabase
    .from('deliveries')
    .select('id, delivery_type, cod_collected, cod_reversed, order:orders(cod_amount)')
    .in('id', ids) as unknown as { data: DeliveryRow[] | null; error: unknown }

  if (fetchError) return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
  if (!deliveries || deliveries.length === 0) {
    return NextResponse.json({ error: 'Aucune livraison trouvée' }, { status: 404 })
  }

  let eligibleDeliveries: DeliveryRow[]
  let skipped: number
  let message: string | null = null

  if (action === 'cod_collected') {
    const eligible = deliveries.filter(d => !d.cod_collected)
    skipped = deliveries.length - eligible.length
    eligibleDeliveries = eligible
  } else {
    // Une livraison personnelle est encaissée directement par le vendeur :
    // aucun reversement transporteur ne doit être créé.
    const eligible = deliveries.filter(
      d => d.delivery_type === 'carrier' && d.cod_collected && !d.cod_reversed,
    )
    const notCollected = deliveries.filter(d => !d.cod_collected && !d.cod_reversed).length
    const selfDeliveries = deliveries.filter(d => d.delivery_type === 'self').length
    skipped = deliveries.length - eligible.length
    eligibleDeliveries = eligible
    const reasons: string[] = []
    if (notCollected > 0) {
      reasons.push(`${notCollected} COD non collecté${notCollected !== 1 ? 's' : ''}`)
    }
    if (selfDeliveries > 0) {
      reasons.push(`${selfDeliveries} livraison${selfDeliveries !== 1 ? 's' : ''} en personne`)
    }
    message = reasons.length > 0 ? `${reasons.join(' · ')} ignoré${skipped !== 1 ? 's' : ''}` : null
  }

  if (eligibleDeliveries.length === 0) {
    return NextResponse.json({
      updated: 0,
      skipped: deliveries.length,
      message: action === 'cod_reversed'
        ? message ?? 'Aucune livraison éligible. Le COD doit être collecté avant d\'être reversé.'
        : null,
    }, action === 'cod_reversed' ? { status: 400 } : undefined)
  }

  if (action === 'cod_collected') {
    for (const delivery of eligibleDeliveries) {
      const rpcName = delivery.delivery_type === 'self'
        ? 'mark_self_delivery_complete'
        : 'mark_delivery_cod_collected'
      const { error: rpcError } = await supabase.rpc(rpcName, {
        p_seller_id: context.sellerId,
        p_user_id: context.userId,
        p_delivery_id: delivery.id,
      })
      if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    return NextResponse.json({ updated: eligibleDeliveries.length, skipped, message })
  }

  let updated = 0
  for (const delivery of eligibleDeliveries) {
    const order = Array.isArray(delivery.order) ? delivery.order[0] : delivery.order
    if (!order || !Number.isFinite(order.cod_amount) || order.cod_amount <= 0) {
      return NextResponse.json({
        error: 'Montant COD invalide pour une livraison sélectionnée.',
        updated,
        skipped: skipped + eligibleDeliveries.length - updated,
      }, { status: 409 })
    }

    const { error: rpcError } = await supabase.rpc('mark_delivery_cod_reversed', {
      p_delivery_id: delivery.id,
      p_seller_id: context.sellerId,
      p_amount: order.cod_amount,
      p_notes: 'Reversement groupé',
      p_reversed_by: context.userId,
    })
    if (rpcError) {
      Sentry.captureException(new Error(rpcError.message), { tags: { module: 'deliveries_bulk' } })
      return NextResponse.json({
        error: rpcError.message,
        updated,
        skipped: skipped + eligibleDeliveries.length - updated,
      }, { status: 409 })
    }
    updated += 1
  }

  return NextResponse.json({ updated, skipped, message })
}
