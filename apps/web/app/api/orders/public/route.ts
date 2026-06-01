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

  if (!slug || !customer_name || !customer_phone || !customer_address || !customer_city || !product_id || !quantity) {
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

  // 2. Find product and verify stock
  const { data: product } = await supabase
    .from('products')
    .select('id, name, price, stock')
    .eq('id', product_id as string)
    .eq('seller_id', seller.id)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
  }

  const qty = Number(quantity)
  if (product.stock < qty) {
    return NextResponse.json(
      { error: `Stock insuffisant. Il reste ${product.stock} unité(s) disponible(s).` },
      { status: 400 }
    )
  }

  // 3. Upsert customer (find by phone + seller_id or create)
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('seller_id', seller.id)
    .eq('phone', customer_phone as string)
    .maybeSingle()

  let customerId: string

  if (existing) {
    customerId = existing.id
    await supabase.from('customers').update({
      name: customer_name as string,
      address: customer_address as string,
      city: customer_city as string,
    }).eq('id', customerId)
  } else {
    const { data: newCustomer, error: custErr } = await supabase
      .from('customers')
      .insert({
        seller_id: seller.id,
        name: customer_name as string,
        phone: customer_phone as string,
        address: customer_address as string,
        city: customer_city as string,
      })
      .select('id')
      .single()

    if (custErr || !newCustomer) {
      return NextResponse.json({ error: 'Erreur lors de la création du client' }, { status: 500 })
    }
    customerId = newCustomer.id
  }

  // 4. Create order with pending status
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      seller_id: seller.id,
      customer_id: customerId,
      product_id: product_id as string,
      variant: (variant as string | undefined) || null,
      quantity: qty,
      cod_amount: product.price * qty,
      notes: (notes as string | undefined) || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 })
  }

  // 5. Decrement stock
  await supabase
    .from('products')
    .update({ stock: product.stock - qty })
    .eq('id', product_id as string)

  return NextResponse.json({ success: true, order_id: order.id })
}
