import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { getTrackingUrl, formatTunisianPhone, isValidTunisianPhone } from '@/lib/constants'

type Params = { params: Promise<{ orderId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const ip = getClientIp(req.headers)
  const rl = await checkRateLimit(ip, 'track', 30, 60).catch(() => null)
  if (rl && !rl.allowed) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }

  const { orderId } = await params
  if (!orderId || orderId.length < 8) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, status, cod_amount, variant, quantity, created_at,
      customer_city, customer_governorate, customer_delegation,
      seller:sellers(phone),
      customer:customers(name, city, customer_governorate, customer_city, customer_delegation),
      product:products(name, image_url)
    `)
    .eq('tracking_token', orderId)
    .is('deleted_at', null)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  type SellerRow   = { phone?: string | null }
  type CustomerRow = {
    name: string
    city?: string | null
    customer_governorate?: string | null
    customer_city?: string | null
    customer_delegation?: string | null
  }
  type ProductRow  = { name: string; image_url?: string | null }
  const seller   = (Array.isArray(order.seller)   ? order.seller[0]   : order.seller)   as SellerRow   | null
  const customer = (Array.isArray(order.customer) ? order.customer[0] : order.customer) as CustomerRow | null
  const product  = (Array.isArray(order.product)  ? order.product[0]  : order.product)  as ProductRow  | null

  const [{ data: delivery }, { data: history }] = await Promise.all([
    supabase
      .from('deliveries')
      .select('delivery_type, carrier, tracking_number, vendor_note')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('order_status_history')
      .select('status, changed_at')
      .eq('order_id', order.id)
      .order('changed_at', { ascending: true }),
  ])

  const deliveryType = (delivery?.delivery_type ?? 'carrier') as 'self' | 'carrier'
  const trackingUrl  = deliveryType === 'carrier' && delivery?.carrier && delivery?.tracking_number
    ? getTrackingUrl(delivery.carrier, delivery.tracking_number)
    : null

  const rawPhone        = seller?.phone ?? ''
  const normalizedPhone = formatTunisianPhone(rawPhone)
  const sellerWhatsapp = isValidTunisianPhone(normalizedPhone)
    ? `https://wa.me/216${normalizedPhone}`
    : null
  const customerLocation = [
    order.customer_delegation ?? order.customer_city ?? customer?.customer_delegation ?? customer?.customer_city,
    order.customer_governorate ?? customer?.customer_governorate ?? customer?.city,
  ].filter(Boolean).join(' · ')

  return NextResponse.json({
    order_id:      orderId.slice(0, 8).toUpperCase(),
    status:        order.status,
    created_at:    order.created_at,
    product_name:  product?.name ?? '',
    product_image: product?.image_url ?? null,
    variant:       order.variant ?? null,
    quantity:      order.quantity,
    cod_amount:    order.cod_amount,
    customer_name: customer?.name?.split(' ')[0] ?? '',
    customer_city: customerLocation,
    delivery: delivery
      ? {
          delivery_type: deliveryType,
          carrier:       delivery.carrier ?? null,
          tracking:      delivery.tracking_number ?? null,
          tracking_url:  trackingUrl,
          vendor_note:   delivery.vendor_note ?? null,
          seller_whatsapp: deliveryType === 'self' ? sellerWhatsapp : null,
        }
      : null,
    status_history: history ?? [],
  })
}
