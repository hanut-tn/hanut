'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Clock, CheckCircle, Truck, Package, RotateCcw,
  MapPin, Phone, ShoppingBag,
} from 'lucide-react'
import type { OrderStatus } from '@hanut/types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; cls: string; dot: string }> = {
  pending:   { label: 'En attente',  cls: 'bg-amber-50 text-amber-700 border border-amber-200',   dot: 'bg-amber-400' },
  new:       { label: 'Nouvelle',    cls: 'bg-blue-50 text-blue-700 border border-blue-200',       dot: 'bg-blue-400' },
  confirmed: { label: 'Confirmée',   cls: 'bg-violet-50 text-violet-700 border border-violet-200', dot: 'bg-violet-400' },
  shipped:   { label: 'Expédiée',    cls: 'bg-orange-50 text-orange-700 border border-orange-200', dot: 'bg-orange-400' },
  delivered: { label: 'Livrée',      cls: 'bg-green-50 text-green-700 border border-green-200',    dot: 'bg-green-400' },
  returned:  { label: 'Retournée',   cls: 'bg-red-50 text-red-700 border border-red-200',          dot: 'bg-red-400' },
}

const STATUS_FLOW: OrderStatus[] = ['new', 'confirmed', 'shipped', 'delivered']

const TIMELINE_ICONS: Record<string, React.ElementType> = {
  created:   Clock,
  new:       ShoppingBag,
  confirmed: CheckCircle,
  shipped:   Truck,
  delivered: CheckCircle,
  returned:  RotateCcw,
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-TN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

type Props = {
  role: string
  order: {
    id: string
    status: string
    cod_amount: number
    variant?: string | null
    quantity: number
    notes?: string | null
    created_at: string
  }
  customer: {
    id: string
    name: string
    phone: string
    address?: string | null
    city?: string | null
  } | null
  product: {
    id: string
    name: string
    price: number
    cost?: number | null
    image_url?: string | null
  } | null
  customerStats: {
    orderCount: number
    totalSpent: number
  }
  linkedCustomer: { id: string; name: string } | null
  hasExistingCustomer: boolean
  updateStatus: (id: string, status: OrderStatus) => Promise<void>
  confirmOrder: (id: string) => Promise<void>
  cancelOrder: (id: string) => Promise<void>
}

export default function OrderDetail({
  role,
  order,
  customer,
  product,
  customerStats,
  linkedCustomer,
  hasExistingCustomer,
  updateStatus,
  confirmOrder,
  cancelOrder,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [bannerLoading, setBannerLoading] = useState(false)
  const [bannerDone, setBannerDone] = useState(false)

  const status = order.status as OrderStatus
  const st = STATUS_CONFIG[status]
  const canWrite = role !== 'readonly'
  const isPendingOrder = status === 'pending'
  const ini = customer ? initials(customer.name) : '?'
  const estimatedProfit = order.cod_amount - (product?.cost ?? 0)
  const shortId = order.id.slice(0, 8).toUpperCase()

  function handleAction(fn: () => Promise<void>) {
    setActionError(null)
    startTransition(async () => {
      try {
        await fn()
        router.refresh()
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
  }

  async function linkToExisting() {
    if (!linkedCustomer) return
    setBannerLoading(true)
    await fetch(`/api/orders/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: linkedCustomer.id }),
    })
    setBannerDone(true)
    setBannerLoading(false)
    router.refresh()
  }

  /* Build timeline steps from current status */
  const timelineItems: { icon: React.ElementType; label: string; date?: string; active: boolean }[] = [
    { icon: Clock, label: 'Commande créée', date: formatDate(order.created_at), active: true },
  ]
  if (status !== 'pending') {
    const flowIdx = STATUS_FLOW.indexOf(status)
    STATUS_FLOW.forEach((s, i) => {
      if (i <= flowIdx) {
        const Icon = TIMELINE_ICONS[s] ?? CheckCircle
        timelineItems.push({
          icon: Icon,
          label: STATUS_CONFIG[s].label,
          active: i === flowIdx,
        })
      }
    })
  }
  if (status === 'returned') {
    timelineItems.push({ icon: RotateCcw, label: 'Retournée', active: true })
  }

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-[#78716C] hover:text-[#1C1917] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux commandes
      </Link>

      {/* Banners */}
      {isPendingOrder && !bannerDismissed && !bannerDone && (
        hasExistingCustomer && linkedCustomer ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900">
                Ce numéro correspond au client <span className="underline">{linkedCustomer.name}</span>
              </p>
              <p className="text-xs text-blue-600 mt-0.5">Lier cette commande à ce client existant&nbsp;?</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setBannerDismissed(true)} className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors">
                Ignorer
              </button>
              <button onClick={linkToExisting} disabled={bannerLoading} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors font-semibold">
                {bannerLoading ? '...' : 'Lier'}
              </button>
            </div>
          </div>
        ) : customer && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-900">Nouveau client détecté</p>
              <p className="text-xs text-green-600 mt-0.5">Créer une fiche client pour <span className="font-medium">{customer.phone}</span> ?</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setBannerDismissed(true)} className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-100 transition-colors">
                Ignorer
              </button>
              <Link href={customer.id ? `/customers/${customer.id}` : '#'} className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold">
                Voir la fiche
              </Link>
            </div>
          </div>
        )
      )}

      {bannerDone && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 font-medium">
          Client lié avec succès.
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* LEFT — 60% */}
        <div className="lg:col-span-3 space-y-4">

          {/* Order info */}
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs text-[#78716C] font-mono mb-1">#{shortId}</p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${st.cls}`}>
                  <span className={`w-2 h-2 rounded-full ${st.dot}${isPendingOrder ? ' animate-pulse' : ''}`} />
                  {st.label}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#78716C]">Créée le</p>
                <p className="text-sm font-medium text-[#1C1917]">
                  {new Date(order.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs text-[#78716C]">
                  {new Date(order.created_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            {order.notes && (
              <div className="pt-4 border-t border-[#E7E5E4]">
                <p className="text-xs font-medium text-[#78716C] mb-1">Notes</p>
                <p className="text-sm text-[#1C1917] whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Client */}
          {customer && (
            <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[#1C1917]">Client</h2>
                <Link href={`/customers/${customer.id}`} className="text-xs text-[#16A34A] hover:text-[#15803D] font-medium transition-colors">
                  Voir la fiche →
                </Link>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#F0FDF4] text-[#166534] flex items-center justify-center font-semibold text-sm shrink-0 select-none">
                  {ini}
                </div>
                <div>
                  <p className="font-semibold text-[#1C1917]">{customer.name}</p>
                  <p className="text-sm text-[#78716C] font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {customer.phone}
                  </p>
                </div>
              </div>
              {(customer.city || customer.address) && (
                <p className="text-sm text-[#78716C] flex items-center gap-1.5 mb-3">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {[customer.address, customer.city].filter(Boolean).join(', ')}
                </p>
              )}
              {customerStats.orderCount > 0 && (
                <div className="pt-3 border-t border-[#E7E5E4]">
                  <p className="text-xs text-[#78716C]">
                    <span className="font-semibold text-[#1C1917]">{customerStats.orderCount}</span> commande{customerStats.orderCount > 1 ? 's' : ''} précédente{customerStats.orderCount > 1 ? 's' : ''}
                    {customerStats.totalSpent > 0 && (
                      <> · <span className="font-semibold text-[#1C1917]">{customerStats.totalSpent} DT</span> dépensés</>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Produit */}
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#1C1917]">Produit commandé</h2>
              {product && (
                <Link href={`/catalog/${product.id}`} className="text-xs text-[#16A34A] hover:text-[#15803D] font-medium transition-colors">
                  Voir le produit →
                </Link>
              )}
            </div>
            <div className="flex items-center gap-4">
              {product?.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-lg object-cover border border-[#E7E5E4] shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-[#F5F5F4] border border-[#E7E5E4] flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-[#A8A29E]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1C1917]">{product?.name ?? '—'}</p>
                {order.variant && <p className="text-sm text-[#78716C]">{order.variant}</p>}
                {order.quantity > 1 && <p className="text-sm text-[#78716C]">× {order.quantity}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-[#1C1917]">{order.cod_amount} DT</p>
                {order.quantity > 1 && product && (
                  <p className="text-xs text-[#78716C]">{product.price} DT / unité</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — 40% */}
        <div className="lg:col-span-2 space-y-4">

          {/* Actions card */}
          {canWrite && (
            <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-[#1C1917] mb-4">Actions disponibles</h2>

              {status === 'pending' && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleAction(() => confirmOrder(order.id))}
                    disabled={isPending}
                    className="w-full btn-primary text-sm disabled:opacity-50"
                  >
                    {isPending ? 'Traitement...' : 'Confirmer la commande'}
                  </button>
                  <button
                    onClick={() => handleAction(() => cancelOrder(order.id))}
                    disabled={isPending}
                    className="w-full px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    Annuler la commande
                  </button>
                </div>
              )}

              {status === 'new' && (
                <button
                  onClick={() => handleAction(() => updateStatus(order.id, 'confirmed'))}
                  disabled={isPending}
                  className="w-full btn-primary text-sm disabled:opacity-50"
                >
                  {isPending ? 'Traitement...' : 'Confirmer la commande'}
                </button>
              )}

              {status === 'confirmed' && (
                <button
                  onClick={() => handleAction(() => updateStatus(order.id, 'shipped'))}
                  disabled={isPending}
                  className="w-full btn-primary text-sm disabled:opacity-50"
                >
                  {isPending ? 'Traitement...' : 'Marquer comme expédiée'}
                </button>
              )}

              {status === 'shipped' && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleAction(() => updateStatus(order.id, 'delivered'))}
                    disabled={isPending}
                    className="w-full btn-primary text-sm disabled:opacity-50"
                  >
                    {isPending ? 'Traitement...' : 'Marquer comme livrée'}
                  </button>
                  <button
                    onClick={() => handleAction(() => updateStatus(order.id, 'returned'))}
                    disabled={isPending}
                    className="w-full px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    Marquer comme retournée
                  </button>
                </div>
              )}

              {status === 'delivered' && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-sm font-medium text-green-700">Commande terminée</p>
                </div>
              )}

              {status === 'returned' && (
                <button
                  onClick={() => handleAction(() => updateStatus(order.id, 'new'))}
                  disabled={isPending}
                  className="w-full px-4 py-2 text-sm font-medium text-[#78716C] border border-[#E7E5E4] rounded-lg hover:bg-[#FAFAF9] disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Traitement...' : 'Remettre en nouvelle'}
                </button>
              )}
            </div>
          )}

          {/* Résumé financier */}
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-[#1C1917] mb-4">Résumé financier</h2>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[#78716C]">Montant COD</span>
                <span className="text-2xl font-bold text-[#16A34A]">{order.cod_amount} DT</span>
              </div>
              {product?.cost !== undefined && product?.cost !== null && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#78716C]">Coût produit</span>
                    <span className="text-sm text-[#1C1917]">−{product.cost} DT</span>
                  </div>
                  <div className="pt-2 border-t border-[#E7E5E4] flex items-center justify-between">
                    <span className="text-sm font-medium text-[#1C1917]">Profit estimé</span>
                    <span className={`text-sm font-semibold ${estimatedProfit >= 0 ? 'text-[#16A34A]' : 'text-red-600'}`}>
                      {estimatedProfit >= 0 ? '+' : ''}{estimatedProfit} DT
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-[#1C1917] mb-4">Historique</h2>
            <div className="space-y-3">
              {timelineItems.map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      item.active ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F5F5F4] text-[#A8A29E]'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${item.active ? 'text-[#1C1917]' : 'text-[#A8A29E]'}`}>
                        {item.label}
                      </p>
                      {item.date && (
                        <p className="text-xs text-[#78716C]">{item.date}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
