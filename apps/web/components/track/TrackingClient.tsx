'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  CheckCircle2, Circle, Package, Truck, ExternalLink, MapPin, RefreshCw, RotateCcw,
  XCircle,
} from 'lucide-react'
import { getCarrierConfig } from '@/lib/constants'
import type { CarrierName } from '@hanut/types'

const STATUS_MESSAGE: Record<string, string> = {
  pending:   'Votre commande est en attente de confirmation. Le vendeur vous contactera bientôt.',
  new:       'Votre commande est confirmée ! On prépare votre colis.',
  confirmed: 'Votre commande est confirmée ! On prépare votre colis.',
  shipped:   'Votre colis est en route ! Livraison prévue sous 24–48h.',
  delivered: 'Votre commande a été livrée. Merci pour votre confiance !',
  returned:  "Votre commande a été retournée. Contactez le vendeur pour plus d'informations.",
  cancelled: 'Votre commande a été annulée. Contactez le vendeur pour plus d’informations.',
}

const TRACKING_STEPS = [
  { key: 'received',  label: 'Commande reçue',       matchStatuses: ['pending', 'new'] },
  { key: 'confirmed', label: 'Commande confirmée',    matchStatuses: ['confirmed'] },
  { key: 'shipped',   label: 'En cours de livraison', matchStatuses: ['shipped'] },
  { key: 'delivered', label: 'Livrée',                matchStatuses: ['delivered'] },
] as const

function getCurrentStepIndex(status: string): number {
  if (status === 'pending' || status === 'new') return 0
  if (status === 'confirmed') return 1
  if (status === 'shipped') return 2
  if (status === 'delivered') return 3
  return -1
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-TN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export type TrackData = {
  full_id: string
  status: string
  created_at: string
  product_name: string
  product_image: string | null
  variant: string | null
  quantity: number
  cod_amount: number
  customer_name: string
  customer_city: string | null
  delivery: {
    carrier: string
    tracking: string | null
    tracking_url: string | null
  } | null
  status_history: { status: string; changed_at: string }[]
}

type Props = {
  initialData: TrackData
  orderId: string
}

export default function TrackingClient({ initialData, orderId }: Props) {
  const [data, setData] = useState<TrackData>(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const isRefreshingRef = useRef(false)
  const lastUpdatedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return
    isRefreshingRef.current = true
    setIsRefreshing(true)
    try {
      const res = await fetch(`/api/track/${orderId}`, { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      setData({
        full_id:       json.full_id,
        status:        json.status,
        created_at:    json.created_at,
        product_name:  json.product_name,
        product_image: json.product_image,
        variant:       json.variant,
        quantity:      json.quantity,
        cod_amount:    json.cod_amount,
        customer_name: json.customer_name,
        customer_city: json.customer_city,
        delivery:      json.delivery,
        status_history: json.status_history ?? [],
      })
      const now = new Date()
      setLastUpdated(`${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`)
      if (lastUpdatedTimeoutRef.current) {
        clearTimeout(lastUpdatedTimeoutRef.current)
      }
      lastUpdatedTimeoutRef.current = setTimeout(() => setLastUpdated(null), 3000)
    } catch {
      // Le polling est silencieux : le prochain cycle ou le bouton manuel retentera.
    } finally {
      isRefreshingRef.current = false
      setIsRefreshing(false)
    }
  }, [orderId])

  // Polling toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  useEffect(() => {
    return () => {
      if (lastUpdatedTimeoutRef.current) {
        clearTimeout(lastUpdatedTimeoutRef.current)
      }
    }
  }, [])

  const currentStatus  = data.status
  const currentStepIdx = getCurrentStepIndex(currentStatus)
  const isReturned     = currentStatus === 'returned'
  const isCancelled    = currentStatus === 'cancelled'

  const statusMap = new Map<string, string>()
  for (const h of data.status_history) {
    statusMap.set(h.status, h.changed_at)
  }
  if (!statusMap.has(currentStatus)) {
    statusMap.set(currentStatus, data.created_at)
  }

  const timelineSteps = isReturned
    ? TRACKING_STEPS.slice(0, 3)
    : isCancelled
      ? TRACKING_STEPS.slice(0, 1)
      : TRACKING_STEPS

  const carrier       = data.delivery?.carrier as CarrierName | undefined
  const trackingUrl   = data.delivery?.tracking_url ?? null
  const carrierConfig = carrier ? getCarrierConfig(carrier) : null

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
            <p className="text-xs text-[#78716C] font-mono">#{data.full_id.slice(0, 8).toUpperCase()}</p>
            <p className="text-xs text-[#78716C] mt-0.5">
              Passée le {new Date(data.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {data.product_image ? (
              <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#E7E5E4]">
                <Image src={data.product_image} alt={data.product_name} fill sizes="64px" className="object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-[#F0FDF4] flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-[#78716C]" />
              </div>
            )}
            <div>
              <p className="font-semibold text-[#1C1917]">{data.product_name}</p>
              {data.variant && <p className="text-sm text-[#78716C]">{data.variant}</p>}
              {data.quantity > 1 && <p className="text-sm text-[#78716C]">× {data.quantity}</p>}
              <p className="text-sm font-bold text-[#16A34A] mt-0.5">{data.cod_amount} DT</p>
            </div>
          </div>

          {(data.customer_name || data.customer_city) && (
            <div className="pt-3 border-t border-[#E7E5E4] flex items-center gap-2 text-sm text-[#78716C]">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{data.customer_name?.split(' ')[0]}{data.customer_city ? ` · ${data.customer_city}` : ''}</span>
            </div>
          )}
        </div>

        {/* Message statut */}
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          currentStatus === 'delivered' ? 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]'
          : currentStatus === 'returned' ? 'bg-red-50 text-red-700 border border-red-200'
          : currentStatus === 'cancelled' ? 'bg-gray-50 text-gray-700 border border-gray-200'
          : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {STATUS_MESSAGE[currentStatus] ?? 'Statut en cours de mise à jour.'}
        </div>

        {/* Timeline */}
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1C1917] mb-4">Suivi</h2>
          <div className="space-y-0">
            {timelineSteps.map((step, i) => {
              const isCurrent = (step.matchStatuses as readonly string[]).includes(currentStatus)
              const isDone = isReturned
                ? step.key === 'received' || (step.matchStatuses as readonly string[]).some(s => statusMap.has(s))
                : currentStepIdx > i
              const changedAt = step.key === 'received'
                ? (statusMap.get('new') ?? statusMap.get('pending') ?? data.created_at)
                : statusMap.get(step.matchStatuses[0])

              return (
                <div key={step.key} className="flex gap-4">
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
            {(isReturned || isCancelled) && (
              <div className={`flex items-center gap-3 p-3 rounded-lg mt-2 ${
                isCancelled ? 'bg-gray-50 border border-gray-200' : 'bg-red-50 border border-red-200'
              }`}>
                {isCancelled ? (
                  <XCircle className="w-5 h-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <RotateCcw className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-semibold ${isCancelled ? 'text-gray-700' : 'text-red-700'}`}>
                    {isCancelled ? 'Commande annulée' : 'Commande retournée'}
                  </p>
                  {statusMap.get(currentStatus) && (
                    <p className={`text-xs mt-0.5 ${isCancelled ? 'text-gray-500' : 'text-red-500'}`}>
                      {formatDate(statusMap.get(currentStatus)!)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tracking livraison */}
        {data.delivery && (
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
              {data.delivery.tracking ? (
                <p className="font-mono text-sm text-[#1C1917]">{data.delivery.tracking}</p>
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

        {/* Actualiser */}
        <div className="flex flex-col items-center gap-2 py-2">
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-xs text-[#78716C] hover:text-[#1C1917] mx-auto mt-4 min-h-[44px] px-4 rounded-lg hover:bg-[#F5F5F4] touch-manipulation transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          {lastUpdated ? (
            <p className="text-xs text-[#16A34A]">Mis à jour à {lastUpdated}</p>
          ) : (
            <p className="text-xs text-[#A8A29E]">Mise à jour automatique toutes les 30 secondes</p>
          )}
        </div>

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
