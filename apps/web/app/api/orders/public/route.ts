import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const { slug, customer_name, customer_phone, customer_address, customer_city, product_id, variant, quantity, notes } = body

  if (
    !slug ||
    !customer_name ||
    !customer_phone ||
    !customer_address ||
    !customer_city ||
    !product_id ||
    quantity === undefined ||
    quantity === null ||
    quantity === ''
  ) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 1. Find seller by slug
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, name')
    .eq('slug', slug as string)
    .single()

  if (!seller) {
    return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
  }

  const qty = Number(quantity)
  if (!Number.isInteger(qty) || qty < 1) {
    return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 })
  }

  const { data: orderId, error } = await supabase.rpc('create_order_with_stock', {
    p_seller_id: seller.id,
    p_product_id: product_id as string,
    p_quantity: qty,
    p_customer_name: customer_name as string,
    p_customer_phone: customer_phone as string,
    p_customer_address: customer_address as string,
    p_customer_city: customer_city as string,
    p_customer_id: null,
    p_variant: (variant as string | undefined) || null,
    p_cod_amount: null,
    p_notes: (notes as string | undefined) || null,
    p_status: 'pending',
  })

  if (error || !orderId) {
    const message = error?.message ?? 'Erreur lors de la création de la commande'
    const status = message.includes('introuvable')
      ? 404
      : message.includes('insuffisant') || message.includes('invalide') || message.includes('obligatoire')
        ? 400
        : 500

    return NextResponse.json({ error: message }, { status })
  }

  return NextResponse.json({ success: true, order_id: orderId })
}
