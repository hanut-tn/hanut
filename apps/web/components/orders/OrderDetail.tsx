'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowLeft, Clock, CheckCircle, Truck, Package, RotateCcw,
  MapPin, Phone, ShoppingBag, Copy, XCircle, X, User,
} from 'lucide-react'
import type { OrderStatus } from '@hanut/types'
import { DELETABLE_STATUSES, ORDER_STATUS_LABELS, CARRIER_OPTIONS } from '@/lib/constants'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { initials } from '@/lib/utils'

const STATUS_FLOW: OrderStatus[] = ['new', 'confirmed', 'shipped', 'delivered']

const TIMELINE_ICONS: Record<string, React.ElementType> = {
  created:   Clock,
  new:       ShoppingBag,
  confirmed: CheckCircle,
  shipped:   Truck,
  delivered: CheckCircle,
  returned:  RotateCcw,
  cancelled: XCircle,
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-TN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

type OrderItemRow = {
  id: string
  product_id: string
  variant?: string | null
  quantity: number
  unit_price: number
  unit_cost: number
  created_at: string
  product?: { id: string; name: string; price: number } | null
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
    customer_address?: string | null
    customer_city?: string | null
    customer_governorate?: string | null
    customer_delegation?: string | null
    customer_landmark?: string | null
    customer_postal_code?: string | null
    delivery_notes?: string | null
    address_version?: number | null
    created_at: string
    items?: OrderItemRow[]
  }
  customer: {
    id: string
    name: string
    phone: string
    address?: string | null
    city?: string | null
    customer_address?: string | null
    customer_city?: string | null
    customer_governorate?: string | null
    customer_delegation?: string | null
    customer_landmark?: string | null
    customer_postal_code?: string | null
    delivery_notes?: string | null
    address_version?: number | null
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
  trackingToken?: string | null
  linkedCustomer: { id: string; name: string } | null
  hasExistingCustomer: boolean
  updateStatus: (id: string, status: OrderStatus) => Promise<void>
  confirmOrder: (id: string) => Promise<void>
  cancelOrder: (id: string) => Promise<void | { error?: string }>
  deleteOrder?: (id: string) => Promise<{ error?: string }>
  createDeliveryFromOrder?: (orderId: string, deliveryType: 'self' | 'carrier', carrier: string | undefined, tracking: string | undefined, fee: number, vendorNote?: string) => Promise<{ error?: string }>
}

export default function OrderDetail({
  role,
  order,
  customer,
  product,
  customerStats,
  trackingToken,
  linkedCustomer,
  hasExistingCustomer,
  updateStatus,
  confirmOrder,
  cancelOrder,
  deleteOrder,
  createDeliveryFromOrder,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Modal création livraison (status confirmed) — 2 étapes
  const [showShipModal, setShowShipModal] = useState(false)
  const [shipStep, setShipStep] = useState<'type' | 'form'>('type')
  const [shipType, setShipType] = useState<'self' | 'carrier' | ''>('')
  const [shipCarrier, setShipCarrier] = useState('')
  const [shipTracking, setShipTracking] = useState('')
  const [shipFee, setShipFee] = useState<number | ''>(0)
  const [shipVendorNote, setShipVendorNote] = useState('')
  const [shipError, setShipError] = useState<string | null>(null)

  const status = order.status as OrderStatus
  const canWrite = role !== 'readonly'
  const isPendingOrder = status === 'pending'
  const canDelete = role === 'admin' && deleteOrder && DELETABLE_STATUSES.includes(status)
  const ini = customer ? initials(customer.name) : '?'
  const totalCost = order.items && order.items.length > 0
    ? order.items.reduce((s, i) => s + i.unit_cost * i.quantity, 0)
    : (product?.cost ?? 0) * order.quantity
  const estimatedProfit = order.cod_amount - totalCost
  const shortId = order.id.slice(0, 8).toUpperCase()
  const orderAddress = order.customer_address ?? customer?.customer_address ?? customer?.address ?? null
  const orderCity = order.customer_city ?? customer?.customer_city ?? null
  const orderDelegation = order.customer_delegation ?? customer?.customer_delegation ?? null
  const orderGovernorate = order.customer_governorate ?? customer?.customer_governorate ?? customer?.city ?? null
  const orderLandmark = order.customer_landmark ?? customer?.customer_landmark ?? null
  const orderPostalCode = order.customer_postal_code ?? customer?.customer_postal_code ?? null
  const deliveryNotes = order.delivery_notes ?? customer?.delivery_notes ?? null
  const addressLines = [
    orderAddress,
    orderLandmark ? `Repère: ${orderLandmark}` : null,
    orderDelegation && orderDelegation !== orderCity ? orderDelegation : null,
    orderCity,
    orderGovernorate,
    orderPostalCode,
  ].filter(Boolean)

  function handleAction(fn: () => Promise<void | { error?: string }>) {
    setActionError(null)
    startTransition(async () => {
      try {
        const result = await fn()
        if (result && 'error' in result && result.error) {
          setActionError(result.error)
          return
        }
        router.refresh()
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
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
          label: ORDER_STATUS_LABELS[s],
          active: i === flowIdx,
        })
      }
    })
  }
  if (status === 'returned') {
    timelineItems.push({ icon: RotateCcw, label: 'Retournée', active: true })
  }
  if (status === 'cancelled') {
    timelineItems.push({ icon: XCircle, label: 'Annulée', active: true })
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
      {isPendingOrder && !bannerDismissed && (
        hasExistingCustomer && linkedCustomer ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900">
                Ce numéro correspond au client <span className="underline">{linkedCustomer.name}</span>
              </p>
              <p className="text-xs text-blue-600 mt-0.5">Ouvrez sa fiche pour vérifier les informations avant de traiter la commande.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setBannerDismissed(true)} className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors">
                Ignorer
              </button>
              <Link href={`/customers/${linkedCustomer.id}`} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-semibold">
                Voir la fiche
              </Link>
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
                <StatusBadge status={status} size="md" pulseDot={isPendingOrder} />
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
              {addressLines.length > 0 && (
                <p className="text-sm text-[#78716C] flex items-start gap-1.5 mb-3">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{addressLines.join(', ')}</span>
                </p>
              )}
              {deliveryNotes && (
                <div className="text-xs text-[#78716C] bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg px-3 py-2 mb-3 whitespace-pre-wrap">
                  <span className="font-medium text-[#1C1917]">Notes livraison: </span>{deliveryNotes}
                </div>
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

          {/* Produit(s) commandé(s) */}
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#1C1917]">
                {order.items && order.items.length > 1 ? 'Articles commandés' : 'Produit commandé'}
              </h2>
              {product && (!order.items || order.items.length <= 1) && (
                <Link href={`/catalog/${product.id}`} className="text-xs text-[#16A34A] hover:text-[#15803D] font-medium transition-colors">
                  Voir le produit →
                </Link>
              )}
            </div>

            {order.items && order.items.length > 0 ? (
              <div className="space-y-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E7E5E4]">
                      <th className="text-left text-xs font-medium text-[#78716C] pb-2">Produit</th>
                      <th className="text-center text-xs font-medium text-[#78716C] pb-2">Qté</th>
                      <th className="text-right text-xs font-medium text-[#78716C] pb-2">Prix unit.</th>
                      <th className="text-right text-xs font-medium text-[#78716C] pb-2">Sous-total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} className="border-b border-[#F5F5F4] last:border-0">
                        <td className="py-2.5 pr-2">
                          <p className="font-medium text-[#1C1917]">{item.product?.name ?? '—'}</p>
                          {item.variant && <p className="text-xs text-[#78716C]">{item.variant}</p>}
                        </td>
                        <td className="py-2.5 text-center text-[#78716C]">{item.quantity}</td>
                        <td className="py-2.5 text-right text-[#78716C]">{item.unit_price} DT</td>
                        <td className="py-2.5 text-right font-medium text-[#1C1917]">
                          {(item.unit_price * item.quantity).toFixed(2)} DT
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[#E7E5E4]">
                      <td colSpan={3} className="pt-2.5 text-right text-sm font-medium text-[#1C1917]">Total COD</td>
                      <td className="pt-2.5 text-right text-base font-bold text-[#16A34A]">{order.cod_amount} DT</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {product?.image_url ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#E7E5E4] shrink-0">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k="
                    />
                  </div>
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
                  {order.quantity > 1 && (
                    <p className="text-xs text-[#78716C]">{(order.cod_amount / order.quantity).toFixed(2)} DT / unité</p>
                  )}
                </div>
              </div>
            )}
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
                    className="w-full px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                  >
                    Annuler la commande
                  </button>
                </div>
              )}

              {status === 'new' && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleAction(() => updateStatus(order.id, 'confirmed'))}
                    disabled={isPending}
                    className="w-full btn-primary text-sm disabled:opacity-50"
                  >
                    {isPending ? 'Traitement...' : 'Confirmer la commande'}
                  </button>
                  <button
                    onClick={() => handleAction(() => cancelOrder(order.id))}
                    disabled={isPending}
                    className="w-full px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                  >
                    Annuler la commande
                  </button>
                </div>
              )}

              {status === 'confirmed' && (
                <div className="space-y-2">
                  {createDeliveryFromOrder ? (
                    <button
                      onClick={() => {
                        setShipStep('type'); setShipType(''); setShipCarrier('')
                        setShipTracking(''); setShipFee(0); setShipVendorNote(''); setShipError(null)
                        setShowShipModal(true)
                      }}
                      disabled={isPending}
                      className="w-full btn-primary text-sm disabled:opacity-50"
                    >
                      Créer une livraison
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(() => updateStatus(order.id, 'shipped'))}
                      disabled={isPending}
                      className="w-full btn-primary text-sm disabled:opacity-50"
                    >
                      {isPending ? 'Traitement...' : 'Marquer comme expédiée'}
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(() => cancelOrder(order.id))}
                    disabled={isPending}
                    className="w-full px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                  >
                    Annuler la commande
                  </button>
                </div>
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
                    className="w-full px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                  >
                    Marquer comme retournée
                  </button>
                  <p className="text-xs text-[#A8A29E] text-center pt-1">
                    Pour annuler une commande expédiée, marquez-la d&apos;abord comme retournée.
                  </p>
                </div>
              )}

              {status === 'delivered' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-sm font-medium text-green-700">Commande terminée</p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97]"
                    >
                      Supprimer cette commande
                    </button>
                  )}
                </div>
              )}

              {status === 'returned' && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleAction(() => cancelOrder(order.id))}
                    disabled={isPending}
                    className="w-full px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                  >
                    {isPending ? 'Traitement...' : 'Annuler et remettre en stock'}
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97]"
                    >
                      Supprimer cette commande
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Lien de suivi client */}
          {trackingToken && (
            <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-[#1C1917] mb-3">Lien de suivi client</h2>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/track/${trackingToken}`
                  navigator.clipboard.writeText(url).catch(() => {})
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[#E7E5E4] rounded-lg text-sm text-[#78716C] hover:bg-[#FAFAF9] transition-colors min-h-[44px] touch-manipulation"
              >
                <Copy className="w-4 h-4" />
                Copier le lien de suivi
              </button>
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
              {totalCost > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#78716C]">Prix d&apos;achat</span>
                    <span className="text-sm text-[#1C1917]">−{totalCost} DT</span>
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

      {/* Modal création livraison — 2 étapes */}
      {showShipModal && createDeliveryFromOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="flex min-h-[100svh] w-full flex-col bg-white shadow-xl sm:min-h-0 sm:max-w-md sm:rounded-xl sm:border sm:border-[#E7E5E4]">
            <div className="sticky top-0 border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#1C1917] text-lg">Créer une livraison</h3>
                <p className="text-xs text-[#78716C] mt-0.5">{customer?.name} · {order.cod_amount} DT</p>
              </div>
              <button type="button" onClick={() => setShowShipModal(false)} className="flex min-h-[44px] w-11 touch-manipulation items-center justify-center rounded-lg hover:bg-[#F5F5F4] text-[#78716C] transition-colors" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Étape 1 : choix du type */}
            {shipStep === 'type' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  <p className="text-sm text-[#78716C] mb-4">Comment voulez-vous livrer cette commande ?</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => { setShipType('carrier'); setShipStep('form'); setShipCarrier('') }}
                      className="flex flex-col items-center gap-3 rounded-xl border-2 border-[#E7E5E4] p-5 text-left hover:border-[#16A34A] hover:bg-[#F0FDF4] transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center group-hover:bg-[#F0FDF4]">
                        <Truck className="w-5 h-5 text-orange-600 group-hover:text-[#16A34A]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1C1917] text-sm">Via transporteur</p>
                        <p className="text-xs text-[#78716C] mt-0.5">IntiGo, Navex, Aramex…</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShipType('self'); setShipStep('form') }}
                      className="flex flex-col items-center gap-3 rounded-xl border-2 border-[#E7E5E4] p-5 text-left hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1C1917] text-sm">Livraison personnelle</p>
                        <p className="text-xs text-[#78716C] mt-0.5">Vous livrez vous-même</p>
                      </div>
                    </button>
                  </div>
                </div>
                <div className="sticky bottom-0 border-t border-[#E7E5E4] bg-white px-4 py-4 sm:px-6">
                  <button type="button" onClick={() => setShowShipModal(false)} className="btn-secondary min-h-[44px] touch-manipulation w-full">Annuler</button>
                </div>
              </>
            )}

            {/* Étape 2 : formulaire transporteur */}
            {shipStep === 'form' && shipType === 'carrier' && (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                  <button type="button" onClick={() => setShipStep('type')} className="text-sm text-[#78716C] hover:text-[#1C1917] flex items-center gap-1 transition-colors">
                    ← Retour
                  </button>
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1">Transporteur *</label>
                    <select
                      className="input min-h-[44px] text-base md:text-sm"
                      value={shipCarrier}
                      onChange={e => setShipCarrier(e.target.value)}
                    >
                      <option value="">Sélectionner un transporteur…</option>
                      {CARRIER_OPTIONS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1">N° de suivi</label>
                      <input
                        className="input min-h-[44px] text-base md:text-sm font-mono"
                        value={shipTracking}
                        onChange={e => setShipTracking(e.target.value)}
                        placeholder="Optionnel"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1">Frais (DT)</label>
                      <input
                        className="input min-h-[44px] text-base md:text-sm"
                        type="number"
                        min="0"
                        step="0.01"
                        value={shipFee}
                        onChange={e => setShipFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  {shipError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{shipError}</p>
                  )}
                </div>
                <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#E7E5E4] bg-white px-4 py-4 sm:flex-row sm:px-6">
                  <button type="button" onClick={() => setShipStep('type')} className="btn-secondary min-h-[44px] touch-manipulation flex-1">Retour</button>
                  <button
                    type="button"
                    disabled={isPending || !shipCarrier}
                    onClick={() => {
                      if (!shipCarrier) { setShipError('Sélectionnez un transporteur'); return }
                      const fee = shipFee === '' ? 0 : Number(shipFee)
                      if (!Number.isFinite(fee) || fee < 0) { setShipError('Frais invalides.'); return }
                      setShipError(null)
                      startTransition(async () => {
                        try {
                          const result = await createDeliveryFromOrder(order.id, 'carrier', shipCarrier, shipTracking.trim() || undefined, fee)
                          if (result?.error) { setShipError(result.error); return }
                          setShowShipModal(false)
                          router.refresh()
                        } catch (err: unknown) {
                          setShipError(err instanceof Error ? err.message : 'Erreur inconnue')
                        }
                      })
                    }}
                    className="btn-primary min-h-[44px] touch-manipulation flex-1 disabled:opacity-50"
                  >
                    {isPending ? 'Création...' : 'Créer la livraison'}
                  </button>
                </div>
              </>
            )}

            {/* Étape 2 : formulaire livraison personnelle */}
            {shipStep === 'form' && shipType === 'self' && (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                  <button type="button" onClick={() => setShipStep('type')} className="text-sm text-[#78716C] hover:text-[#1C1917] flex items-center gap-1 transition-colors">
                    ← Retour
                  </button>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <p className="text-sm text-blue-800 font-medium">Livraison personnelle</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Vous allez livrer cette commande vous-même et encaisser le COD directement.
                      Marquez-la comme &quot;Livré + COD encaissé&quot; depuis la page Livraisons une fois livrée.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1">Message pour le client (optionnel)</label>
                    <textarea
                      className="input resize-none text-base md:text-sm"
                      rows={3}
                      maxLength={1000}
                      value={shipVendorNote}
                      onChange={e => setShipVendorNote(e.target.value)}
                      placeholder="Ex : Livraison prévue demain matin"
                    />
                    <p className="mt-1 text-xs text-[#78716C]">
                      Visible par le client sur sa page de suivi.
                    </p>
                  </div>
                  {shipError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{shipError}</p>
                  )}
                </div>
                <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#E7E5E4] bg-white px-4 py-4 sm:flex-row sm:px-6">
                  <button type="button" onClick={() => setShipStep('type')} className="btn-secondary min-h-[44px] touch-manipulation flex-1">Retour</button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setShipError(null)
                      startTransition(async () => {
                        try {
                          const result = await createDeliveryFromOrder(order.id, 'self', undefined, undefined, 0, shipVendorNote.trim() || undefined)
                          if (result?.error) { setShipError(result.error); return }
                          setShowShipModal(false)
                          router.refresh()
                        } catch (err: unknown) {
                          setShipError(err instanceof Error ? err.message : 'Erreur inconnue')
                        }
                      })
                    }}
                    className="btn-primary min-h-[44px] touch-manipulation flex-1 disabled:opacity-50"
                  >
                    {isPending ? 'Création...' : 'Confirmer la livraison'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal suppression depuis le détail */}
      {confirmDelete && deleteOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-[#1C1917] mb-1">Supprimer cette commande ?</h3>
            <p className="text-sm text-[#78716C] mb-3">
              {status === 'delivered'
                ? 'Cette commande livrée sera déplacée dans la corbeille. Les statistiques seront mises à jour.'
                : 'La commande sera déplacée dans la corbeille. Restaurable pendant 30 jours.'}
            </p>
            <div className="bg-[#FAFAF9] rounded-lg px-4 py-3 mb-5 space-y-0.5 text-sm">
              <p className="font-medium text-[#1C1917]">{customer?.name ?? '—'}</p>
              <p className="text-[#78716C]">{product?.name ?? '—'}</p>
              <p className="font-semibold text-[#1C1917]">{order.cod_amount} DT</p>
            </div>
            {actionError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{actionError}</p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1">Annuler</button>
              <button
                disabled={isPending}
                onClick={() => {
                  setActionError(null)
                  startTransition(async () => {
                    const result = await deleteOrder(order.id)
                    if (result?.error) {
                      setActionError(result.error)
                      return
                    }
                    router.push('/orders')
                  })
                }}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-150 ease-out hover:bg-red-700 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-red-600/40 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:ring-0 disabled:active:scale-100"
              >
                {isPending ? 'Déplacement...' : 'Déplacer vers la corbeille'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
