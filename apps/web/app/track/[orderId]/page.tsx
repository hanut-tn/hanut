import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, Circle, Package, Truck, ExternalLink, MapPin, SearchX } from 'lucide-react'
import { CARRIER_TRACKING_URLS, getCarrierConfig } from '@/lib/constants'
import type { CarrierName } from '@hanut/types'

export const metadata: Metadata = {
  title: 'Suivi de commande — Hanut',
  description: 'Suivez l\'état de votre commande en temps réel.',
  robots: { index: false, follow: false },
}

type Params = { params: Promise<{ orderId: string }> }

const STATUS_FLOW = ['new', 'confirmed', 'shipped', 'delivered'] as const

const STATUS_MESSAGE: Record<string, string> = {
  pending:   'Votre commande est en attente de confirmation. Le vendeur vous contactera bientôt.',
  new:       'Votre commande est confirmée ! On prépare votre colis.',
  confirmed: 'Votre commande est confirmée ! On prépare votre colis.',
  shipped:   'Votre colis est en route ! Livraison prévue sous 24–48h.',
  delivered: 'Votre commande a été livrée. Merci pour votre confiance !',
  returned:  'Votre commande a été retournée. Contactez le vendeur pour plus d\'informations.',
}

function getStepIndex(status: string): number {
  if (status === 'pending') return 0
  return STATUS_FLOW.indexOf(status as typeof STATUS_FLOW[number])
}

export default async function TrackPage({ params }: Params) {
  const { orderId } = await params

  if (!orderId || orderId.length < 8) {
    return <NotFound />
  }

  const supabase = createServiceClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, cod_amount, variant, quantity, created_at, customer:customers(name, city), product:products(name, image_url)')
    .eq('id', orderId)
    .is('deleted_at', null)
    .single()

  if (!order) return <NotFound />

  type CustomerRow = { name: string; city?: string | null }
  type ProductRow = { name: string; image_url?: string | null }
  const customer = (Array.isArray(order.customer) ? order.customer[0] : order.customer) as CustomerRow | null
  const product = (Array.isArray(order.product) ? order.product[0] : order.product) as ProductRow | null

  const [{ data: delivery }, { data: history }] = await Promise.all([
    supabase
      .from('deliveries')
      .select('carrier, tracking_number')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('order_status_history')
      .select('status, changed_at')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: true }),
  ])

  const carrier = delivery?.carrier as CarrierName | undefined
  const trackingUrl = carrier && delivery?.tracking_number && CARRIER_TRACKING_URLS[carrier]
    ? `${CARRIER_TRACKING_URLS[carrier]}${delivery.tracking_number}`
    : null
  const carrierConfig = carrier ? getCarrierConfig(carrier) : null

  const currentStatus = order.status
  const currentStepIndex = getStepIndex(currentStatus)
  const isReturned = currentStatus === 'returned'

  // Build timeline from history or derive from current status
  const statusMap = new Map<string, string>()
  for (const h of history ?? []) {
    statusMap.set(h.status, h.changed_at)
  }
  if (!statusMap.has(currentStatus)) {
    statusMap.set(currentStatus, order.created_at)
  }

  const timelineSteps = [
    { status: 'new', label: 'Commande reçue' },
    { status: 'confirmed', label: 'Commande confirmée' },
    { status: 'shipped', label: 'En cours de livraison' },
    ...(isReturned
      ? [{ status: 'returned', label: 'Retournée' }]
      : [{ status: 'delivered', label: 'Livrée' }]
    ),
  ]

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-TN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0B5E46] rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">H</span>
            </div>
            <span className="font-bold text-[#1C1917]">Hanut</span>
          </div>
          <span className="text-xs text-[#78716C]">Suivi de commande</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Carte commande */}
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <p className="text-xs text-[#78716C] font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-xs text-[#78716C] mt-0.5">
              Passée le {new Date(order.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {product?.image_url ? (
              <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#E7E5E4]">
                <Image src={product.image_url} alt={product?.name ?? ''} fill sizes="64px" className="object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-[#F0FDF4] flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-[#78716C]" />
              </div>
            )}
            <div>
              <p className="font-semibold text-[#1C1917]">{product?.name}</p>
              {order.variant && <p className="text-sm text-[#78716C]">{order.variant}</p>}
              {order.quantity > 1 && <p className="text-sm text-[#78716C]">× {order.quantity}</p>}
              <p className="text-sm font-bold text-[#16A34A] mt-0.5">{order.cod_amount} DT</p>
            </div>
          </div>

          {customer && (
            <div className="pt-3 border-t border-[#E7E5E4] flex items-center gap-2 text-sm text-[#78716C]">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{customer.name?.split(' ')[0]} · {customer.city}</span>
            </div>
          )}
        </div>

        {/* Message statut */}
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          currentStatus === 'delivered' ? 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]'
          : currentStatus === 'returned' ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {STATUS_MESSAGE[currentStatus] ?? 'Statut en cours de mise à jour.'}
        </div>

        {/* Timeline */}
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1C1917] mb-4">Suivi</h2>
          <div className="space-y-0">
            {timelineSteps.map((step, i) => {
              const stepIdx = getStepIndex(step.status)
              const isDone = isReturned
                ? step.status !== 'returned' ? stepIdx < getStepIndex(currentStatus) : true
                : stepIdx < currentStepIndex || (stepIdx === currentStepIndex && currentStatus !== 'pending')
              const isCurrent = step.status === currentStatus
              const changedAt = statusMap.get(step.status)

              return (
                <div key={step.status} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isDone || isCurrent ? 'text-[#16A34A]' : 'text-[#E7E5E4]'
                    }`}>
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isCurrent ? (
                        <Circle className="w-5 h-5 animate-pulse" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </div>
                    {i < timelineSteps.length - 1 && (
                      <div className={`w-0.5 h-8 mt-1 ${isDone ? 'bg-[#16A34A]/30' : 'bg-[#E7E5E4]'}`} />
                    )}
                  </div>
                  <div className="pb-6 flex-1 min-w-0">
                    <p className={`text-sm ${isCurrent ? 'font-semibold text-[#0B5E46]' : isDone ? 'text-[#1C1917]' : 'text-[#A8A29E]'}`}>
                      {step.label}
                    </p>
                    {changedAt && (isDone || isCurrent) && (
                      <p className="text-xs text-[#78716C] mt-0.5">{formatDate(changedAt)}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tracking livraison */}
        {delivery && (
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-[#78716C]" />
              <h2 className="text-sm font-semibold text-[#1C1917]">Suivi transporteur</h2>
            </div>
            <div className="space-y-2">
              {carrierConfig && (
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${carrierConfig.bg} ${carrierConfig.color}`}>
                  {carrierConfig.label}
                </span>
              )}
              {delivery.tracking_number ? (
                <p className="font-mono text-sm text-[#1C1917]">{delivery.tracking_number}</p>
              ) : (
                <p className="text-sm text-[#78716C]">Numéro de suivi non disponible</p>
              )}
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[#16A34A] hover:text-[#0B5E46] font-medium"
                >
                  Suivre mon colis sur {carrierConfig?.label}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 text-center">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <div className="w-4 h-4 bg-[#0B5E46] rounded flex items-center justify-center">
            <span className="text-white font-bold" style={{ fontSize: '9px' }}>H</span>
          </div>
          Propulsé par Hanut
        </Link>
      </footer>
    </div>
  )
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
