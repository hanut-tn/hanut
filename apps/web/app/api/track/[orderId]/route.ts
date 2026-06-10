import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { CARRIER_TRACKING_URLS } from '@/lib/constants'
import type { CarrierName } from '@hanut/types'

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
    .select('id, status, cod_amount, variant, quantity, created_at, customer:customers(name, city), product:products(name, image_url)')
    .eq('tracking_token', orderId)
    .is('deleted_at', null)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  type CustomerRow = { name: string; city?: string | null }
  type ProductRow = { name: string; image_url?: string | null }
  const customer = (Array.isArray(order.customer) ? order.customer[0] : order.customer) as CustomerRow | null
  const product = (Array.isArray(order.product) ? order.product[0] : order.product) as ProductRow | null

  const [{ data: delivery }, { data: history }] = await Promise.all([
    supabase
      .from('deliveries')
      .select('carrier, tracking_number')
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

  const carrier = delivery?.carrier as CarrierName | undefined
  const trackingUrl = carrier && delivery?.tracking_number && CARRIER_TRACKING_URLS[carrier]
    ? `${CARRIER_TRACKING_URLS[carrier]}${delivery.tracking_number}`
    : null

  return NextResponse.json({
    order_id: order.id.slice(0, 8).toUpperCase(),
    status: order.status,
    created_at: order.created_at,
    product_name: product?.name ?? '',
    product_image: product?.image_url ?? null,
    variant: order.variant ?? null,
    quantity: order.quantity,
    cod_amount: order.cod_amount,
    customer_name: customer?.name?.split(' ')[0] ?? '',
    customer_city: customer?.city ?? '',
    delivery: delivery
      ? {
          carrier: delivery.carrier,
          tracking: delivery.tracking_number ?? null,
          tracking_url: trackingUrl,
        }
      : null,
    status_history: history ?? [],
  })
}
