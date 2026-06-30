'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Truck, ExternalLink, CheckCircle2, ArrowDownCircle,
  Banknote, Receipt, Pencil, Trash2, CheckSquare, X, Search, AlertCircle, User,
} from 'lucide-react'
import type { CarrierName } from '@hanut/types'
import type {
  CreateDeliveryInput,
  DeliveryMutationResult,
  DeliveryRow,
  UpdateDeliveryInput,
} from '@/app/(dashboard)/deliveries/actions'
import { CARRIER_OPTIONS, getCarrierConfig, getTrackingUrl } from '@/lib/constants'
import { initials } from '@/lib/utils'

type OrderInfo = {
  id: string
  cod_amount: number
  customer: { name: string; phone: string }
  product: { name: string }
}

type Delivery = {
  id: string
  delivery_type: 'self' | 'carrier'
  carrier: CarrierName | null
  tracking_number?: string | null
  carrier_status?: string | null
  fee?: number | null
  vendor_note?: string | null
  cod_collected: boolean
  cod_reversed: boolean
  created_at: string
  delivered_at?: string | null
  order: OrderInfo | OrderInfo[]
}

type CodSummary = {
  total_collected_amount: number
  total_reversed_amount: number
  pending_reversal_count: number
  pending_reversal_amount: number
  total_fees: number
  total_deliveries: number
}

type Props = {
  role: 'admin' | 'operator' | 'readonly'
  deliveries: Delivery[]
  shippableOrders: OrderInfo[]
  createDelivery: (input: CreateDeliveryInput) => Promise<{ error?: string }>
  updateDelivery: (id: string, input: UpdateDeliveryInput) => Promise<DeliveryMutationResult>
  markCodReversed: (id: string, amount: number, notes?: string) => Promise<DeliveryMutationResult>
  markSelfDeliveryComplete: (deliveryId: string) => Promise<{ error?: string }>
  deleteDelivery: (id: string) => Promise<{ error?: string }>
  codSummary?: CodSummary | null
  codSummaryUnavailable?: boolean
  hasMore?: boolean
  loadMore?: (cursor: string) => Promise<DeliveryRow[]>
}

type Tab = 'all' | 'pending' | 'collected' | 'reversed'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all',       label: 'Toutes' },
  { key: 'pending',   label: 'En cours' },
  { key: 'collected', label: 'COD collecté' },
  { key: 'reversed',  label: 'Argent reçu' },
]

function getOrder(d: Delivery): OrderInfo | null {
  const o = Array.isArray(d.order) ? d.order[0] : d.order
  return o ?? null
}

function DeliveryMobileCard({
  delivery,
  isPending,
  onToggle,
  onEdit,
  onDelete,
  onComplete,
  canReverseCod,
  selectionMode = false,
  isSelected = false,
  onSelect,
}: {
  delivery: Delivery
  isPending: boolean
  onToggle: (delivery: Delivery, field: 'cod_collected' | 'cod_reversed') => void
  onEdit: (delivery: Delivery) => void
  onDelete: (delivery: Delivery) => void
  onComplete: (delivery: Delivery) => void
  canReverseCod: boolean
  selectionMode?: boolean
  isSelected?: boolean
  onSelect?: (id: string) => void
}) {
  const order = getOrder(delivery)
  const isSelf = delivery.delivery_type === 'self'
  const carrierCfg = !isSelf && delivery.carrier ? getCarrierConfig(delivery.carrier) : null
  const trackingHref = !isSelf && delivery.carrier && delivery.tracking_number
    ? getTrackingUrl(delivery.carrier, delivery.tracking_number)
    : null
  const ini = order?.customer?.name ? initials(order.customer.name) : '?'

  return (
    <div
      className={`rounded-xl shadow-sm p-4 transition-all ${isSelected ? 'bg-[#F0FDF4] border-2 border-[#16A34A]' : 'bg-white border border-[#E7E5E4]'}`}
      onClick={selectionMode ? () => onSelect?.(delivery.id) : undefined}
    >
      {selectionMode && (
        <label className="flex items-center gap-2 mb-3 cursor-pointer" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect?.(delivery.id)}
            className="w-4 h-4 rounded accent-[#16A34A]"
          />
          <span className="text-xs font-medium text-[#78716C] select-none">
            {isSelected ? 'Sélectionnée' : 'Sélectionner'}
          </span>
        </label>
      )}

      {/* Ligne 1 : avatar + infos client + badge type + date */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#F0FDF4] text-[#166534] flex items-center justify-center text-xs font-semibold shrink-0 select-none">
          {ini}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1C1917] truncate">{order?.customer?.name ?? '—'}</p>
          <p className="text-xs text-[#78716C]">{order?.customer?.phone}</p>
          <p className="text-xs text-[#78716C] mt-0.5">
            {order?.product?.name} — <span className="font-medium text-[#1C1917]">{order?.cod_amount} DT</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          {isSelf ? (
            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
              En personne
            </span>
          ) : carrierCfg ? (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${carrierCfg.bg} ${carrierCfg.color}`}>
              {carrierCfg.label}
            </span>
          ) : null}
          <p className="text-[10px] text-[#78716C] mt-1">
            {new Date(delivery.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })}
          </p>
        </div>
      </div>

      {/* Message visible par le client pour une livraison personnelle */}
      {isSelf && delivery.vendor_note && (
        <div className="mt-3 bg-[#FAFAF9] rounded-lg px-3 py-2">
          <p className="text-xs text-[#78716C] italic">{delivery.vendor_note}</p>
        </div>
      )}

      {/* Ligne tracking (transporteur uniquement) */}
      {!isSelf && (delivery.tracking_number || delivery.carrier_status) && (
        <div className="mt-3 flex items-center gap-2 bg-[#FAFAF9] rounded-lg px-3 py-2">
          <span className="text-xs text-[#78716C] shrink-0">N° suivi :</span>
          {trackingHref ? (
            <a
              href={trackingHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="font-mono text-xs text-[#16A34A] hover:text-[#0B5E46] flex items-center gap-1 min-w-0 truncate"
            >
              <span className="truncate">{delivery.tracking_number}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          ) : (
            <span className="text-xs text-[#78716C]">{delivery.tracking_number ?? delivery.carrier_status}</span>
          )}
        </div>
      )}

      {/* Badge incomplet + bouton compléter (transporteur sans tracking) */}
      {!isSelf && !delivery.tracking_number && !selectionMode && (
        <div className="mt-2 flex items-center gap-2">
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2 py-0.5 rounded-full font-medium">
            Incomplet
          </span>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onComplete(delivery) }}
            className="border border-[#16A34A] text-[#16A34A] hover:bg-[#F0FDF4] rounded-lg px-3 py-1 text-xs font-medium transition-colors"
          >
            Compléter
          </button>
        </div>
      )}

      {/* Bouton "Livré + COD encaissé" pour livraison personnelle non collectée */}
      {isSelf && !delivery.cod_collected && !selectionMode && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggle(delivery, 'cod_collected') }}
          disabled={isPending}
          className="mt-3 w-full rounded-xl px-3 py-3 text-sm font-medium bg-[#0B5E46] text-white hover:bg-[#0a5240] disabled:opacity-50 transition-colors min-h-[44px] touch-manipulation"
        >
          Livré + COD encaissé
        </button>
      )}

      {/* Ligne COD badges + frais */}
      {!selectionMode && (isSelf ? delivery.cod_collected : true) && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); if (!isSelf) onToggle(delivery, 'cod_collected') }}
            disabled={isPending || isSelf}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[44px] touch-manipulation ${
              delivery.cod_collected
                ? 'bg-green-50 text-green-700 border border-green-200'
                : isSelf
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600'
            }`}
          >
            {delivery.cod_collected ? '✓ COD collecté' : 'COD collecté ?'}
          </button>
          {isSelf ? (
            <span className="flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
              Encaissé directement
            </span>
          ) : (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggle(delivery, 'cod_reversed') }}
              disabled={isPending || !delivery.cod_collected || !canReverseCod}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[44px] touch-manipulation ${
                delivery.cod_reversed
                  ? 'bg-[#F0FDF4] text-[#166534] border border-green-200'
                  : delivery.cod_collected && canReverseCod
                    ? 'bg-gray-100 text-gray-500 hover:bg-[#F0FDF4] hover:text-[#166534]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {delivery.cod_reversed ? '✓ Argent reçu' : delivery.cod_collected ? 'Marquer comme reçu ?' : '—'}
            </button>
          )}
          <div className="shrink-0 text-right min-w-[40px]">
            <p className="text-sm font-semibold text-[#1C1917]">
              {delivery.fee != null && delivery.fee > 0 ? delivery.fee : '0'}
            </p>
            <p className="text-[10px] text-[#78716C]">DT frais</p>
          </div>
        </div>
      )}

      {/* Ligne actions */}
      {!selectionMode && (
        <div className="mt-3 flex gap-2 border-t border-[#E7E5E4] pt-3">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onEdit(delivery) }}
            className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] touch-manipulation text-sm text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F5F4] rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Éditer
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onDelete(delivery) }}
            className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] touch-manipulation text-sm text-[#78716C] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
        </div>
      )}
    </div>
  )
}

export default function DeliveriesClient({
  role,
  deliveries,
  shippableOrders,
  createDelivery,
  updateDelivery,
  markCodReversed,
  markSelfDeliveryComplete,
  deleteDelivery,
  codSummary,
  codSummaryUnavailable = false,
  hasMore = false,
  loadMore,
}: Props) {
  const [tab, setTab] = useState<Tab>('all')
  const [isPending, startTransition] = useTransition()
  const [searchText, setSearchText] = useState('')
  const [carrierFilter, setCarrierFilter] = useState<CarrierName | 'self' | ''>('')

  const [allDeliveries, setAllDeliveries] = useState<Delivery[]>(deliveries)
  const [hasMoreState, setHasMoreState] = useState(hasMore)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    setAllDeliveries(deliveries)
    setHasMoreState(hasMore)
  }, [deliveries, hasMore])

  async function handleLoadMore() {
    if (!loadMore || loadingMore || !hasMoreState) return
    const last = allDeliveries[allDeliveries.length - 1]
    if (!last) return
    setLoadingMore(true)
    try {
      const more = await loadMore(last.created_at)
      if (more.length > 0) setAllDeliveries(prev => [...prev, ...(more as Delivery[])])
      if (more.length < 200) setHasMoreState(false)
    } finally {
      setLoadingMore(false)
    }
  }

  const [showAdd, setShowAdd] = useState(false)
  const [addOrderId, setAddOrderId] = useState('')
  const [addDeliveryType, setAddDeliveryType] = useState<'self' | 'carrier'>('carrier')
  const [addCarrier, setAddCarrier] = useState<CarrierName>('intigo')
  const [addTracking, setAddTracking] = useState('')
  const [addFee, setAddFee] = useState<number | ''>('')
  const [addVendorNote, setAddVendorNote] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const [editDelivery, setEditDelivery] = useState<Delivery | null>(null)
  const [editTracking, setEditTracking] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editFee, setEditFee] = useState<number | ''>('')
  const [editVendorNote, setEditVendorNote] = useState('')

  const [confirmDelete, setConfirmDelete] = useState<Delivery | null>(null)

  const [completeModal, setCompleteModal] = useState<Delivery | null>(null)
  const [completeTracking, setCompleteTracking] = useState('')
  const [completeFee, setCompleteFee] = useState<number | ''>(0)
  const [completeError, setCompleteError] = useState<string | null>(null)

  const router = useRouter()
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkPending, setIsBulkPending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const canReverseCod = role === 'admin'

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const filtered = allDeliveries.filter(d => {
    if (tab === 'pending')   { if (d.cod_collected) return false }
    else if (tab === 'collected') { if (!d.cod_collected || d.cod_reversed) return false }
    else if (tab === 'reversed')  { if (!d.cod_reversed) return false }

    if (carrierFilter === 'self' && d.delivery_type !== 'self') return false
    if (carrierFilter && carrierFilter !== 'self' && d.carrier !== carrierFilter) return false

    const q = searchText.trim().toLocaleLowerCase('fr')
    if (q) {
      const order = getOrder(d)
      const matchesName = order?.customer?.name?.toLocaleLowerCase('fr').includes(q)
      const matchesPhone = order?.customer?.phone?.includes(q)
      const matchesProduct = order?.product?.name?.toLocaleLowerCase('fr').includes(q)
      const matchesTracking = d.tracking_number?.toLocaleLowerCase('fr').includes(q)
      const matchesVendorNote = d.vendor_note?.toLocaleLowerCase('fr').includes(q)
      if (!matchesName && !matchesPhone && !matchesProduct && !matchesTracking && !matchesVendorNote) return false
    }

    return true
  })

  const counts: Record<Tab, number> = {
    all:       allDeliveries.length,
    pending:   allDeliveries.filter(d => !d.cod_collected).length,
    collected: allDeliveries.filter(d =>
      d.cod_collected && (d.delivery_type === 'self' || !d.cod_reversed)
    ).length,
    reversed: allDeliveries.filter(d => d.delivery_type === 'carrier' && d.cod_reversed).length,
  }

  const totalCollected = allDeliveries
    .filter(d => d.cod_collected)
    .reduce((s, d) => s + (getOrder(d)?.cod_amount ?? 0), 0)
  const totalReversed = allDeliveries
    .filter(d => d.delivery_type === 'carrier' && d.cod_reversed)
    .reduce((s, d) => s + (getOrder(d)?.cod_amount ?? 0), 0)
  const totalFees = allDeliveries.reduce((s, d) => s + (d.fee ?? 0), 0)
  const displayedTotalCollected = codSummary?.total_collected_amount ?? totalCollected
  const displayedTotalReversed = codSummary?.total_reversed_amount ?? totalReversed
  const displayedTotalFees = codSummary?.total_fees ?? totalFees
  const displayedPendingReversalCount = codSummary?.pending_reversal_count ?? counts.collected
  const activeCount = allDeliveries.filter(d =>
    d.delivery_type === 'self' ? !d.cod_collected : !d.cod_reversed
  ).length

  function openEdit(d: Delivery) {
    setEditDelivery(d)
    setEditTracking(d.tracking_number ?? '')
    setEditStatus(d.carrier_status ?? '')
    setEditFee(d.fee ?? '')
    setEditVendorNote(d.vendor_note ?? '')
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addOrderId) { setAddError('Sélectionnez une commande.'); return }
    setAddError(null)
    startTransition(async () => {
      try {
        const result = await createDelivery({
          order_id: addOrderId,
          delivery_type: addDeliveryType,
          carrier: addDeliveryType === 'carrier' ? addCarrier : undefined,
          tracking_number: addDeliveryType === 'carrier' ? (addTracking.trim() || undefined) : undefined,
          fee: addFee === '' ? undefined : addFee,
          vendor_note: addDeliveryType === 'self' ? (addVendorNote.trim() || undefined) : undefined,
        })
        if (result?.error) {
          setAddError(result.error)
          return
        }
        setShowAdd(false)
        setAddOrderId(''); setAddDeliveryType('carrier'); setAddCarrier('intigo')
        setAddTracking(''); setAddFee(''); setAddVendorNote('')
      } catch (err) {
        setAddError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editDelivery) return
    startTransition(async () => {
      try {
        const result = await updateDelivery(editDelivery.id, {
          ...(editDelivery.delivery_type === 'carrier'
            ? {
                tracking_number: editTracking.trim() || null,
                carrier_status: editStatus.trim() || null,
                fee: editFee === '' ? null : editFee,
              }
            : {
                vendor_note: editVendorNote.trim() || null,
              }),
        })
        if (result?.error) {
          setToast(`Erreur : ${result.error}`)
          return
        }
        setEditDelivery(null)
      } catch (err) {
        setToast(`Erreur : ${err instanceof Error ? err.message : 'Veuillez réessayer.'}`)
      }
    })
  }

  function handleToggle(d: Delivery, field: 'cod_collected' | 'cod_reversed') {
    const prevValue = d[field]
    const newValue = !prevValue
    if (field === 'cod_reversed' && newValue && !canReverseCod) {
      setToast('Erreur : Action réservée aux admins.')
      return
    }
    setAllDeliveries(list => list.map(del => del.id === d.id ? { ...del, [field]: newValue } : del))
    startTransition(async () => {
      try {
        const order = getOrder(d)
        let result: { error?: string }
        if (field === 'cod_reversed' && newValue) {
          result = order
            ? await markCodReversed(d.id, order.cod_amount)
            : { error: 'Commande liée introuvable.' }
        } else if (field === 'cod_collected' && newValue && d.delivery_type === 'self') {
          result = await markSelfDeliveryComplete(d.id)
        } else {
          result = await updateDelivery(d.id, { [field]: newValue })
        }
        if (result?.error) {
          setAllDeliveries(list => list.map(del => del.id === d.id ? { ...del, [field]: prevValue } : del))
          setToast(`Erreur : ${result.error}`)
          return
        }
        if (field === 'cod_collected' && newValue) setToast('✓ COD collecté · Commande marquée comme livrée')
        else if (field === 'cod_reversed' && newValue) setToast('✓ Argent reçu · Fonds transférés')
        router.refresh()
      } catch (err) {
        setAllDeliveries(list => list.map(del => del.id === d.id ? { ...del, [field]: prevValue } : del))
        setToast(`Erreur : ${err instanceof Error ? err.message : 'Veuillez réessayer.'}`)
      }
    })
  }

  function openComplete(d: Delivery) {
    setCompleteTracking(d.tracking_number ?? '')
    setCompleteFee(d.fee ?? 0)
    setCompleteError(null)
    setCompleteModal(d)
  }

  function handleComplete(e: React.FormEvent) {
    e.preventDefault()
    if (!completeModal) return
    if (!completeTracking.trim()) { setCompleteError('Le numéro de suivi est requis'); return }
    const d = completeModal
    const tracking = completeTracking.trim()
    const fee = completeFee === '' ? null : Number(completeFee) || null
    setAllDeliveries(list => list.map(del => del.id === d.id ? { ...del, tracking_number: tracking, fee } : del))
    setCompleteModal(null)
    startTransition(async () => {
      try {
        const result = await updateDelivery(d.id, { tracking_number: tracking, fee })
        if (result?.error) {
          setAllDeliveries(list => list.map(del => del.id === d.id ? { ...del, tracking_number: d.tracking_number, fee: d.fee } : del))
          setCompleteModal(d)
          setCompleteError(result.error)
          return
        }
        setToast('✓ Livraison complétée')
      } catch (err) {
        setAllDeliveries(list => list.map(del => del.id === d.id ? { ...del, tracking_number: d.tracking_number, fee: d.fee } : del))
        setToast(`Erreur : ${err instanceof Error ? err.message : 'Veuillez réessayer.'}`)
      }
    })
  }

  function handleDelete(d: Delivery) {
    const prev = allDeliveries
    setAllDeliveries(list => list.filter(delivery => delivery.id !== d.id))
    setConfirmDelete(null)
    startTransition(async () => {
      const result = await deleteDelivery(d.id)
      if (result?.error) {
        setAllDeliveries(prev)
        setToast(`Erreur : ${result.error}`)
      } else {
        setToast('✓ Livraison supprimée · La commande a été remise en "Confirmée"')
      }
    })
  }

  async function handleBulkAction(action: 'cod_collected' | 'cod_reversed') {
    if (selectedIds.size === 0) return
    if (action === 'cod_reversed' && !canReverseCod) {
      setToast('Erreur : Action réservée aux admins.')
      return
    }
    setIsBulkPending(true)
    try {
      const res = await fetch('/api/deliveries/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast(data.error ?? data.message ?? 'Erreur')
        if ((data.updated ?? 0) > 0) {
          setSelectionMode(false)
          setSelectedIds(new Set())
          router.refresh()
        }
        return
      }
      const label = action === 'cod_collected' ? 'COD collecté' : 'Argent reçu'
      if (data.skipped > 0 && data.message) {
        setToast(`✓ ${data.updated} mise${data.updated > 1 ? 's' : ''} à jour · ${data.message}`)
      } else if (data.skipped > 0) {
        setToast(`✓ ${data.updated} mise${data.updated > 1 ? 's' : ''} à jour · ${data.skipped} ignorée${data.skipped > 1 ? 's' : ''} (déjà marquée${data.skipped > 1 ? 's' : ''})`)
      } else {
        setToast(`✓ ${data.updated} livraison${data.updated > 1 ? 's' : ''} marquée${data.updated > 1 ? 's' : ''} comme ${label}`)
      }
      const affectedIds = new Set(selectedIds)
      setAllDeliveries(prev => prev.map(d => {
        if (!affectedIds.has(d.id)) return d
        if (action === 'cod_collected') return { ...d, cod_collected: true }
        if (action === 'cod_reversed' && d.delivery_type === 'carrier' && d.cod_collected) {
          return { ...d, cod_reversed: true }
        }
        return d
      }))
      setSelectionMode(false)
      setSelectedIds(new Set())
      router.refresh()
    } finally {
      setIsBulkPending(false)
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)))
    }
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1917]">Livraisons</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            {activeCount} livraison{activeCount !== 1 ? 's' : ''} active{activeCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          disabled={shippableOrders.length === 0}
          className="flex min-h-[44px] touch-manipulation items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg px-4 py-2 text-sm font-medium w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={shippableOrders.length === 0 ? 'Aucune commande expédiée sans livraison' : ''}
        >
          + Ajouter livraison
        </button>
      </div>

      {/* Admin COD summary */}
      {codSummaryUnavailable && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">
            Le résumé COD exact est temporairement indisponible. Les montants affichés ci-dessous sont limités aux livraisons chargées.
          </p>
        </div>
      )}

      {codSummary && codSummary.pending_reversal_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {codSummary.pending_reversal_amount.toFixed(0)} DT en attente de transfert
            </p>
            <p className="text-xs text-amber-600">
              {codSummary.pending_reversal_count} livraison{codSummary.pending_reversal_count > 1 ? 's' : ''} avec COD collecté non transféré
            </p>
          </div>
        </div>
      )}

      {/* Workflow hint: shipped→cancelled */}
      <p className="text-xs text-[#A8A29E]">
        Pour annuler une commande expédiée, ouvrez la fiche commande et marquez-la d&apos;abord comme retournée.
      </p>

      {/* Recherche + filtre transporteur */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
          <input
            className="min-h-[44px] w-full pl-9 pr-11 py-2 text-base md:text-sm bg-white border border-[#E7E5E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition-all placeholder:text-[#A8A29E]"
            placeholder="Rechercher client, téléphone, produit, n° suivi…"
            value={searchText}
            onChange={e => {
              setSearchText(e.target.value)
              setSelectedIds(new Set())
            }}
            aria-label="Rechercher une livraison"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText('')}
              className="absolute right-0 top-1/2 flex min-h-[44px] w-11 -translate-y-1/2 touch-manipulation items-center justify-center text-[#A8A29E] hover:text-[#78716C] transition-colors"
              aria-label="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select
          value={carrierFilter}
          onChange={e => {
            setCarrierFilter(e.target.value as CarrierName | 'self' | '')
            setSelectedIds(new Set())
          }}
          className="min-h-[44px] w-full sm:w-52 py-2 px-3 text-base md:text-sm bg-white border border-[#E7E5E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition-all text-[#78716C]"
          aria-label="Filtrer par transporteur"
        >
          <option value="">Tous les modes</option>
          <option value="self">Livraison en personne</option>
          {CARRIER_OPTIONS.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: 'COD collecté',   value: `${displayedTotalCollected.toFixed(0)} DT`, sub: `${displayedPendingReversalCount} en attente de transfert`, color: 'text-[#16A34A]', Icon: Banknote },
          { label: 'Argent reçu',    value: `${displayedTotalReversed.toFixed(0)} DT`,  sub: `${counts.reversed} livraisons soldées`,                 color: 'text-[#0B5E46]', Icon: ArrowDownCircle },
          { label: 'Frais livreurs', value: `${displayedTotalFees.toFixed(0)} DT`,      sub: 'total transporteurs',                                   color: 'text-[#1C1917]', Icon: Receipt },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#E7E5E4] rounded-xl p-2 sm:p-5 shadow-sm">
            <div className="flex items-center gap-1.5">
              <s.Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#78716C] shrink-0" />
              <p className="text-[10px] sm:text-sm text-[#78716C] font-medium truncate">{s.label}</p>
            </div>
            <p className={`text-lg sm:text-3xl font-bold mt-1 sm:mt-2 ${s.color}`}>{s.value}</p>
            <p className="hidden sm:block text-xs text-[#78716C] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Onglets + bouton Sélectionner */}
      <div className="flex items-center justify-between border-b border-[#E7E5E4]">
        <div className="flex gap-0 overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelectionMode(false); setSelectedIds(new Set()) }}
              className={`whitespace-nowrap px-4 pb-3 text-sm transition-colors ${
                tab === t.key
                  ? 'border-b-2 border-[#16A34A] text-[#166534] font-medium'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span className="ml-1 text-xs">({counts[t.key]})</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setSelectionMode(prev => !prev); setSelectedIds(new Set()) }}
          className={`flex min-h-[44px] touch-manipulation items-center gap-2 border rounded-lg px-3 py-1.5 text-sm transition-colors shrink-0 ${
            selectionMode ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-[#E7E5E4] text-[#78716C] hover:bg-[#F5F5F4]'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          {selectionMode ? 'Annuler' : 'Sélectionner'}
        </button>
      </div>

      {/* Barre d'actions bulk */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-[#166534]">
            {selectedIds.size} livraison{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleBulkAction('cod_collected')}
              disabled={isBulkPending}
              className="flex min-h-[44px] touch-manipulation items-center gap-2 bg-[#16A34A] text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 transition-colors hover:bg-[#15803D]"
            >
              <CheckCircle2 className="w-4 h-4" />
              Marquer COD collecté
            </button>
            {canReverseCod && (
              <button
                onClick={() => handleBulkAction('cod_reversed')}
                disabled={isBulkPending}
                className="flex min-h-[44px] touch-manipulation items-center gap-2 bg-[#0B5E46] text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 transition-colors hover:bg-[#0a5240]"
              >
                <ArrowDownCircle className="w-4 h-4" />
                Confirmer la réception
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setSelectionMode(false); setSelectedIds(new Set()) }}
            className="ml-auto flex min-h-[44px] w-11 touch-manipulation items-center justify-center rounded-lg text-[#78716C] hover:bg-white/70 hover:text-[#1C1917] transition-colors"
            aria-label="Fermer la sélection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* État vide */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-10 text-center">
          <Truck className="w-12 h-12 mx-auto mb-3 text-[#78716C] opacity-30" />
          <p className="font-semibold text-[#1C1917] text-lg mb-1">
            {searchText.trim() || carrierFilter
              ? 'Aucune livraison ne correspond aux filtres'
              : tab === 'all'
                ? 'Aucune livraison enregistrée'
                : 'Aucune livraison dans cette catégorie'}
          </p>
          {(searchText.trim() || carrierFilter) && (
            <button
              type="button"
              onClick={() => { setSearchText(''); setCarrierFilter('') }}
              className="mt-3 min-h-[44px] touch-manipulation text-sm font-medium text-[#16A34A] hover:text-[#15803D]"
            >
              Effacer les filtres
            </button>
          )}
          {tab === 'all' && (
            <p className="text-sm text-[#78716C] mb-5">Créez votre première livraison depuis une commande expédiée</p>
          )}
          {tab === 'all' && shippableOrders.length > 0 && (
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              + Ajouter livraison
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="space-y-3 lg:hidden">
            {filtered.map(d => (
              <DeliveryMobileCard
                key={d.id}
                delivery={d}
                isPending={isPending}
                onToggle={handleToggle}
                onEdit={openEdit}
                onDelete={setConfirmDelete}
                onComplete={openComplete}
                canReverseCod={canReverseCod}
                selectionMode={selectionMode}
                isSelected={selectedIds.has(d.id)}
                onSelect={toggleSelection}
              />
            ))}
          </div>

          {/* ── Tableau desktop ── */}
          <div className="hidden lg:block bg-white border border-[#E7E5E4] rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
                  {selectionMode && (
                    <th className="w-10 px-5 py-3">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded accent-[#16A34A] cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="text-left text-xs font-semibold text-[#78716C] uppercase tracking-wider px-5 py-3">Client / Produit</th>
                  <th className="text-left text-xs font-semibold text-[#78716C] uppercase tracking-wider px-4 py-3 w-32">Transporteur</th>
                  <th className="text-left text-xs font-semibold text-[#78716C] uppercase tracking-wider px-4 py-3 w-44">N° suivi / Note</th>
                  <th className="text-center text-xs font-semibold text-[#78716C] uppercase tracking-wider px-4 py-3 w-36">COD collecté</th>
                  <th className="text-center text-xs font-semibold text-[#78716C] uppercase tracking-wider px-4 py-3 w-32">Argent reçu</th>
                  <th className="text-right text-xs font-semibold text-[#78716C] uppercase tracking-wider px-4 py-3 w-24">Frais</th>
                  <th className="w-20 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const order = getOrder(d)
                  const isSelf = d.delivery_type === 'self'
                  const carrierCfg = !isSelf && d.carrier ? getCarrierConfig(d.carrier) : null
                  const trackingUrl = !isSelf && d.carrier && d.tracking_number
                    ? getTrackingUrl(d.carrier, d.tracking_number)
                    : null
                  const ini = order?.customer?.name ? initials(order.customer.name) : '?'
                  return (
                    <tr
                      key={d.id}
                      onClick={selectionMode ? () => toggleSelection(d.id) : undefined}
                      className={`border-b border-[#E7E5E4] last:border-b-0 transition-colors ${selectionMode ? 'cursor-pointer' : ''} ${selectedIds.has(d.id) ? 'bg-[#F0FDF4]' : 'hover:bg-[#FAFAF9]'}`}
                    >
                      {selectionMode && (
                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(d.id)}
                            onChange={() => toggleSelection(d.id)}
                            className="w-4 h-4 rounded accent-[#16A34A] cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Client / Produit */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#F0FDF4] text-[#166534] flex items-center justify-center text-xs font-semibold shrink-0 select-none">
                            {ini}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1C1917]">{order?.customer?.name ?? '—'}</p>
                            <p className="text-xs text-[#78716C]">{order?.customer?.phone}</p>
                            <p className="text-xs text-[#78716C] mt-0.5">
                              {order?.product?.name} — <span className="font-medium text-[#1C1917]">{order?.cod_amount} DT</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Transporteur */}
                      <td className="px-4 py-4">
                        {isSelf ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            <User className="w-3 h-3" />
                            En personne
                          </span>
                        ) : carrierCfg ? (
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${carrierCfg.bg} ${carrierCfg.color}`}>
                            {carrierCfg.label}
                          </span>
                        ) : (
                          <span className="text-[#78716C]">—</span>
                        )}
                        <p className="text-xs text-[#78716C] mt-1">
                          {new Date(d.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })}
                        </p>
                      </td>

                      {/* N° suivi / Note */}
                      <td className="px-4 py-4">
                        {isSelf ? (
                          d.vendor_note ? (
                            <p className="text-xs text-[#78716C] italic max-w-[160px] truncate">{d.vendor_note}</p>
                          ) : (
                            <span className="text-[#78716C]">—</span>
                          )
                        ) : d.tracking_number ? (
                          trackingUrl ? (
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="font-mono text-sm text-[#16A34A] hover:text-[#0B5E46] flex items-center gap-1"
                            >
                              {d.tracking_number}
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="font-mono text-sm text-[#1C1917]">{d.tracking_number}</span>
                          )
                        ) : !selectionMode ? (
                          <div className="flex items-center gap-2">
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2 py-0.5 rounded-full font-medium">
                              Incomplet
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); openComplete(d) }}
                              className="text-xs border border-[#16A34A] text-[#16A34A] hover:bg-[#F0FDF4] rounded px-2 py-0.5 transition-colors"
                            >
                              Compléter
                            </button>
                          </div>
                        ) : (
                          <span className="text-[#78716C]">—</span>
                        )}
                        {!isSelf && d.carrier_status && <p className="text-xs text-[#78716C] mt-0.5">{d.carrier_status}</p>}
                      </td>

                      {/* COD collecté */}
                      <td className="px-4 py-4 text-center">
                        {!selectionMode && isSelf && !d.cod_collected ? (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); handleToggle(d, 'cod_collected') }}
                            disabled={isPending}
                            className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium bg-[#0B5E46] text-white hover:bg-[#0a5240] disabled:opacity-50 transition-colors"
                          >
                            Livré + COD enc.
                          </button>
                        ) : selectionMode ? (
                          <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                            d.cod_collected
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {d.cod_collected ? '✓ Collecté' : 'Non collecté'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); if (!isSelf) handleToggle(d, 'cod_collected') }}
                            disabled={isPending || isSelf}
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs transition-colors ${
                              d.cod_collected
                                ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                : isSelf
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600'
                            }`}
                          >
                            {d.cod_collected ? '✓ Collecté' : 'Non collecté'}
                          </button>
                        )}
                      </td>

                      {/* COD reversé */}
                      <td className="px-4 py-4 text-center">
                        {isSelf ? (
                          <span className="inline-flex whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700">
                            Encaissement direct
                          </span>
                        ) : selectionMode ? (
                          <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                            d.cod_reversed
                              ? 'bg-[#F0FDF4] text-[#166534] border border-green-200'
                              : d.cod_collected
                                ? 'bg-gray-100 text-gray-500'
                                : 'bg-gray-100 text-gray-400'
                          }`}>
                            {d.cod_reversed ? '✓ Reçu' : d.cod_collected ? 'Non transféré' : '—'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); handleToggle(d, 'cod_reversed') }}
                            disabled={isPending || !d.cod_collected || !canReverseCod}
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs transition-colors ${
                              d.cod_reversed
                                ? 'bg-[#F0FDF4] text-[#166534] border border-green-200 hover:bg-green-100'
                                : d.cod_collected && canReverseCod
                                  ? 'bg-gray-100 text-gray-500 hover:bg-[#F0FDF4] hover:text-[#166534]'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {d.cod_reversed ? '✓ Reçu' : d.cod_collected ? 'Non transféré' : '—'}
                          </button>
                        )}
                      </td>

                      {/* Frais */}
                      <td className="px-4 py-4 text-right">
                        <p className={`text-sm font-medium ${d.fee && d.fee > 0 ? 'text-[#1C1917]' : 'text-[#78716C]'}`}>
                          {d.fee && d.fee > 0 ? `${d.fee} DT` : '—'}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        {!selectionMode && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={e => { e.stopPropagation(); openEdit(d) }}
                              aria-label="Modifier la livraison"
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] text-[#78716C] transition-colors"
                            >
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmDelete(d) }}
                              aria-label="Supprimer la livraison"
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#78716C] hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Charger plus ── */}
      {hasMoreState && (
        <div className="flex justify-center py-5">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="btn-secondary"
          >
            {loadingMore ? 'Chargement…' : 'Charger plus'}
          </button>
        </div>
      )}

      {/* ── MODAL Nouvelle livraison ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="flex min-h-[100svh] w-full flex-col bg-white shadow-xl sm:min-h-0 sm:max-w-md sm:rounded-xl sm:border sm:border-[#E7E5E4]">
            <div className="sticky top-0 border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6 flex items-center justify-between">
              <h3 className="font-semibold text-[#1C1917] text-lg">Nouvelle livraison</h3>
              <button type="button" onClick={() => setShowAdd(false)} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] text-[#78716C] transition-colors">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1">Commande expédiée *</label>
                  <select className="input" value={addOrderId} onChange={e => setAddOrderId(e.target.value)} required>
                    <option value="">Sélectionner une commande…</option>
                    {shippableOrders.map(o => {
                      const customer = Array.isArray(o.customer) ? o.customer[0] : o.customer
                      const product  = Array.isArray(o.product)  ? o.product[0]  : o.product
                      return (
                        <option key={o.id} value={o.id}>
                          {customer?.name} — {product?.name} ({o.cod_amount} DT)
                        </option>
                      )
                    })}
                  </select>
                </div>

                {/* Type de livraison */}
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-2">Type de livraison *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAddDeliveryType('carrier')}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border-2 transition-colors text-sm font-medium ${
                        addDeliveryType === 'carrier'
                          ? 'border-[#16A34A] bg-[#F0FDF4] text-[#166534]'
                          : 'border-[#E7E5E4] text-[#78716C] hover:border-[#D6D3D1]'
                      }`}
                    >
                      <Truck className="w-5 h-5" />
                      Via transporteur
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddDeliveryType('self')}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border-2 transition-colors text-sm font-medium ${
                        addDeliveryType === 'self'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-[#E7E5E4] text-[#78716C] hover:border-[#D6D3D1]'
                      }`}
                    >
                      <User className="w-5 h-5" />
                      En personne
                    </button>
                  </div>
                </div>

                {addDeliveryType === 'carrier' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1">Transporteur *</label>
                      <select className="input" value={addCarrier} onChange={e => setAddCarrier(e.target.value as CarrierName)} required>
                        {CARRIER_OPTIONS.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-[#1C1917] mb-1">N° de suivi</label>
                        <input className="input font-mono" value={addTracking} onChange={e => setAddTracking(e.target.value)} placeholder="Optionnel" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#1C1917] mb-1">Frais (DT)</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={addFee}
                          onChange={e => setAddFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </>
                )}

                {addDeliveryType === 'self' && (
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1">Message pour le client (optionnel)</label>
                    <textarea
                      className="input resize-none text-base md:text-sm"
                      rows={3}
                      maxLength={1000}
                      value={addVendorNote}
                      onChange={e => setAddVendorNote(e.target.value)}
                      placeholder="Ex : Livraison prévue demain matin"
                    />
                    <p className="mt-1 text-xs text-[#78716C]">
                      Visible par le client sur sa page de suivi.
                    </p>
                  </div>
                )}

                {addError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>
                )}
              </div>
              <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#E7E5E4] bg-white px-4 py-4 sm:flex-row sm:px-6">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1">
                  {isPending ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL Modifier livraison ── */}
      {editDelivery && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="flex min-h-[100svh] w-full flex-col bg-white shadow-xl sm:min-h-0 sm:max-w-sm sm:rounded-xl sm:border sm:border-[#E7E5E4]">
            <div className="sticky top-0 border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6 flex items-center justify-between">
              <h3 className="font-semibold text-[#1C1917] text-lg">Modifier la livraison</h3>
              <button type="button" onClick={() => setEditDelivery(null)} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] text-[#78716C] transition-colors">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                {editDelivery.delivery_type === 'carrier' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1">N° de suivi</label>
                      <input className="input font-mono" value={editTracking} onChange={e => setEditTracking(e.target.value)} placeholder="EX123456789TN" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1">Statut transporteur</label>
                      <input className="input" value={editStatus} onChange={e => setEditStatus(e.target.value)} placeholder="En transit, Livré…" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1">Frais de livraison (DT)</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editFee}
                        onChange={e => setEditFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>
                  </>
                )}
                {editDelivery.delivery_type === 'self' && (
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1">
                      Message pour le client (optionnel)
                    </label>
                    <textarea
                      className="input resize-none text-base md:text-sm"
                      rows={3}
                      maxLength={1000}
                      value={editVendorNote}
                      onChange={e => setEditVendorNote(e.target.value)}
                      placeholder="Ex : Livraison prévue demain matin"
                    />
                    <p className="mt-1 text-xs text-[#78716C]">
                      Visible par le client sur sa page de suivi.
                    </p>
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#E7E5E4] bg-white px-4 py-4 sm:flex-row sm:px-6">
                <button type="button" onClick={() => setEditDelivery(null)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1">
                  {isPending ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL Confirmation suppression ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="flex min-h-[100svh] w-full flex-col bg-white shadow-xl sm:min-h-0 sm:max-w-sm sm:rounded-xl sm:border sm:border-[#E7E5E4]">
            <div className="sticky top-0 border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6 flex items-center justify-between">
              <h3 className="font-semibold text-[#1C1917]">Supprimer cette livraison ?</h3>
              <button type="button" onClick={() => setConfirmDelete(null)} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] text-[#78716C] transition-colors">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <p className="text-sm text-[#78716C]">
                {getOrder(confirmDelete)?.customer?.name}{' '}
                — {confirmDelete.delivery_type === 'self' ? 'Livraison personnelle' : (confirmDelete.carrier ? getCarrierConfig(confirmDelete.carrier).label : '—')}
              </p>
            </div>
            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#E7E5E4] bg-white px-4 py-4 sm:flex-row sm:px-6">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={isPending}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL Compléter livraison (transporteur uniquement) ── */}
      {completeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="flex min-h-[100svh] w-full flex-col bg-white shadow-xl sm:min-h-0 sm:max-w-sm sm:rounded-xl sm:border sm:border-[#E7E5E4]">
            <div className="sticky top-0 border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#1C1917]">Compléter la livraison</h3>
                <p className="text-xs text-[#78716C] mt-0.5">
                  {getOrder(completeModal)?.customer?.name}
                  {completeModal.carrier ? ` · ${getCarrierConfig(completeModal.carrier).label}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => setCompleteModal(null)} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] text-[#78716C]">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleComplete} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1">N° de suivi *</label>
                  <input
                    className="input font-mono"
                    value={completeTracking}
                    onChange={e => { setCompleteTracking(e.target.value); setCompleteError(null) }}
                    placeholder="TN-IG-847291"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1">Frais de livraison (DT)</label>
                  <input
                    className="input text-base"
                    type="number"
                    min="0"
                    step="0.01"
                    value={completeFee}
                    onChange={e => setCompleteFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                  />
                </div>
                {completeError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{completeError}</p>
                )}
              </div>
              <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#E7E5E4] bg-white px-4 py-4 sm:flex-row sm:px-6">
                <button type="button" onClick={() => setCompleteModal(null)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1">
                  {isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1C1917] text-white px-4 py-2 rounded-full text-sm shadow-lg whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
