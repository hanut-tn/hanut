import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import type { RateLimitResult } from '@/lib/rate-limit'

const PHONE_RE = /^[0-9]{8}$/

const PublicOrderSchema = z.object({
  slug: z.string().min(1, 'Boutique invalide'),
  customer_name: z.string().min(2, 'Nom trop court').max(100),
  customer_phone: z.string().min(1, 'Téléphone requis'),
  customer_address: z.string().min(2, 'Adresse invalide').max(200),
  customer_city: z.string().min(1, 'Gouvernorat requis').max(100),
  product_id: z.string().min(1, 'Produit requis'),
  variant: z.string().optional(),
  quantity: z.coerce.number().int().min(1, 'Quantité minimum : 1').max(99, 'Quantité maximum : 99'),
  notes: z.string().max(500).optional(),
})

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

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = PublicOrderSchema.safeParse(rawBody)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Données invalides'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { slug, customer_name, customer_phone, customer_address, customer_city, product_id, variant, quantity: qty, notes } = parsed.data

  // Validation téléphone tunisien : exactement 8 chiffres après nettoyage
  const customerPhone = customer_phone.replace(/\D/g, '')
  if (!PHONE_RE.test(customerPhone)) {
    return NextResponse.json({ error: 'Numéro de téléphone invalide (8 chiffres requis)' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Vérification slug → vendeur
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!seller) {
    return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
  }

  // Vérification que product_id appartient bien à ce vendeur
  const { data: product } = await supabase
    .from('products')
    .select('id, variants')
    .eq('id', product_id)
    .eq('seller_id', seller.id)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
  }

  // Validation variante
  type ProductVariant = { size?: string; color?: string; qty: number }
  const productVariants = (product.variants ?? []) as ProductVariant[]
  if (productVariants.length > 0) {
    if (!variant) {
      return NextResponse.json({ error: 'Veuillez choisir une variante' }, { status: 400 })
    }
    const variantLabel = variant
    const matched = productVariants.find(v => {
      const label = [v.size, v.color].filter(Boolean).join(' / ')
      return label === variantLabel
    })
    if (!matched) {
      return NextResponse.json({ error: 'Variante invalide' }, { status: 400 })
    }
    if (matched.qty < qty) {
      return NextResponse.json({ error: 'Stock insuffisant pour cette variante' }, { status: 400 })
    }
  }

  const { data: orderId, error } = await supabase.rpc('create_order_with_stock', {
    p_seller_id: seller.id,
    p_product_id: product_id,
    p_quantity: qty,
    p_customer_name: customer_name,
    p_customer_phone: customerPhone,
    p_customer_address: customer_address,
    p_customer_city: customer_city,
    p_customer_id: null,
    p_variant: variant ?? null,
    p_cod_amount: null,
    p_notes: notes ?? null,
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

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    status: 'pending',
    changed_by: null,
  })

  return NextResponse.json({ success: true, order_id: orderId })
}
