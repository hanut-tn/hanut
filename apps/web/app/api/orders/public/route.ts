import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import type { RateLimitResult } from '@/lib/rate-limit'

const PHONE_RE = /^[0-9]{8}$/

export async function POST(req: Request) {
  const ip = getClientIp(req.headers)
  let rl: RateLimitResult

  try {
    rl = await checkRateLimit(ip, 'orders_public', 10, 60)
  } catch {
    return NextResponse.json(
      { error: 'Protection anti-spam indisponible. Réessayez dans quelques minutes.' },
      { status: 503 }
    )
  }

  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de demandes. Réessayez dans quelques minutes.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rl.resetIn),
          'Retry-After': String(rl.resetIn),
        },
      }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const { slug, customer_name, customer_phone, customer_address, customer_city, product_id, variant, quantity, notes } = body

  if (!slug || !customer_name || !customer_phone || !customer_address || !customer_city || !product_id || quantity == null || quantity === '') {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  // Validation téléphone tunisien : exactement 8 chiffres, espaces tolérés.
  const customerPhone = String(customer_phone).replace(/\D/g, '')
  if (!PHONE_RE.test(customerPhone)) {
    return NextResponse.json({ error: 'Numéro de téléphone invalide (8 chiffres requis)' }, { status: 400 })
  }

  const qty = Number(quantity)
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
    return NextResponse.json({ error: 'Quantité invalide (entre 1 et 99)' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Vérification slug → vendeur
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, name')
    .eq('slug', slug as string)
    .single()

  if (!seller) {
    return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
  }

  // Vérification que product_id appartient bien à ce vendeur
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', product_id as string)
    .eq('seller_id', seller.id)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
  }

  const { data: orderId, error } = await supabase.rpc('create_order_with_stock', {
    p_seller_id: seller.id,
    p_product_id: product_id as string,
    p_quantity: qty,
    p_customer_name: customer_name as string,
    p_customer_phone: customerPhone,
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
