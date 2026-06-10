import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { SearchX } from 'lucide-react'
import { CARRIER_TRACKING_URLS } from '@/lib/constants'
import type { CarrierName } from '@hanut/types'
import TrackingClient, { type TrackData } from '@/components/track/TrackingClient'

export const metadata: Metadata = {
  title: 'Suivi de commande — Hanut',
  description: "Suivez l'état de votre commande en temps réel.",
  robots: { index: false, follow: false },
}

type Params = { params: Promise<{ orderId: string }> }

export default async function TrackPage({ params }: Params) {
  const { orderId } = await params

  if (!orderId || orderId.length < 8) {
    return <NotFound />
  }

  const supabase = createServiceClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, cod_amount, variant, quantity, created_at, customer:customers(name, city), product:products(name, image_url)')
    .eq('tracking_token', orderId)
    .is('deleted_at', null)
    .single()

  if (!order) return <NotFound />

  type CustomerRow = { name: string; city?: string | null }
  type ProductRow  = { name: string; image_url?: string | null }
  const customer = (Array.isArray(order.customer) ? order.customer[0] : order.customer) as CustomerRow | null
  const product  = (Array.isArray(order.product)  ? order.product[0]  : order.product)  as ProductRow  | null

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

  const carrier    = delivery?.carrier as CarrierName | undefined
  const trackingUrl = carrier && delivery?.tracking_number && CARRIER_TRACKING_URLS[carrier]
    ? `${CARRIER_TRACKING_URLS[carrier]}${delivery.tracking_number}`
    : null

  const initialData: TrackData = {
    order_id:       order.id.slice(0, 8).toUpperCase(),
    status:         order.status,
    created_at:     order.created_at,
    product_name:   product?.name  ?? '',
    product_image:  product?.image_url ?? null,
    variant:        order.variant  ?? null,
    quantity:       order.quantity,
    cod_amount:     order.cod_amount,
    customer_name:  customer?.name ?? '',
    customer_city:  customer?.city ?? null,
    delivery: delivery
      ? { carrier: delivery.carrier, tracking: delivery.tracking_number ?? null, tracking_url: trackingUrl }
      : null,
    status_history: (history ?? []) as { status: string; changed_at: string }[],
  }

  return <TrackingClient initialData={initialData} orderId={orderId} />
}

function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center px-4 text-center">
      <SearchX className="w-12 h-12 text-[#78716C] mx-auto mb-4 opacity-50" />
      <h1 className="text-xl font-bold text-[#1C1917] mb-2">Commande introuvable</h1>
      <p className="text-sm text-gray-500 max-w-sm">
        Vérifiez le lien avec le vendeur ou demandez-lui de vous renvoyer le lien de suivi.
      </p>
    </div>
  )
}
