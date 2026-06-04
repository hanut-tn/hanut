'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, ExternalLink, CheckCircle2, ArrowDownCircle } from 'lucide-react'
import type { CarrierName } from '@hanut/types'
import type { CreateDeliveryInput, UpdateDeliveryInput } from '@/app/(dashboard)/deliveries/actions'
import { CARRIER_OPTIONS, CARRIER_TRACKING_URLS, getCarrierConfig } from '@/lib/constants'

type OrderInfo = {
  id: string
  cod_amount: number
  customer: { name: string; phone: string }
  product: { name: string }
}

type Delivery = {
  id: string
  carrier: CarrierName
  tracking_number?: string
  carrier_status?: string
  fee?: number
  cod_collected: boolean
  cod_reversed: boolean
  created_at: string
  delivered_at?: string
  order: OrderInfo | OrderInfo[]
}

type Props = {
  deliveries: Delivery[]
  shippableOrders: OrderInfo[]
  createDelivery: (input: CreateDeliveryInput) => Promise<void>
  updateDelivery: (id: string, input: UpdateDeliveryInput) => Promise<void>
  deleteDelivery: (id: string) => Promise<void>
}

type Tab = 'all' | 'pending' | 'collected' | 'reversed'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all',       label: 'Toutes' },
  { key: 'pending',   label: 'En cours' },
  { key: 'collected', label: 'COD collecté' },
  { key: 'reversed',  label: 'COD reversé' },
]

function getOrder(d: Delivery): OrderInfo | null {
  const o = Array.isArray(d.order) ? d.order[0] : d.order
  return o ?? null
}

function SwitchToggle({
  checked,
  disabled,
  onClick,
  activeClass = 'bg-[#16A34A]',
}: {
  checked: boolean
  disabled?: boolean
  onClick: () => void
  activeClass?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex h-11 w-14 touch-manipulation items-center rounded-full p-1 transition-colors disabled:opacity-40 ${
        checked ? activeClass : 'bg-gray-200'
      }`}
    >
      <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-7' : 'translate-x-0'
      }`} />
    </button>
  )
}

function DeliveryMobileCard({
  delivery,
  isPending,
  onToggle,
  onEdit,
  onDelete,
  selectionMode = false,
  isSelected = false,
  onSelect,
}: {
  delivery: Delivery
  isPending: boolean
  onToggle: (delivery: Delivery, field: 'cod_collected' | 'cod_reversed') => void
  onEdit: (delivery: Delivery) => void
  onDelete: (delivery: Delivery) => void
  selectionMode?: boolean
  isSelected?: boolean
  onSelect?: (id: string) => void
}) {
  const order = getOrder(delivery)
  const carrier = getCarrierConfig(delivery.carrier)
  const trackingHref = delivery.tracking_number
    ? `${CARRIER_TRACKING_URLS[delivery.carrier]}${delivery.tracking_number}`
    : null

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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${carrier.bg} ${carrier.color}`}>
            {carrier.label}
          </span>
          <div className="mt-2">
            {trackingHref ? (
              <a
                href={trackingHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="font-mono text-sm font-semibold text-[#0B5E46] underline underline-offset-2"
              >
                {delivery.tracking_number}
              </a>
            ) : (
              <p className="text-sm text-[#78716C]">Aucun numéro de suivi</p>
            )}
            {delivery.carrier_status && (
              <p className="text-xs text-[#78716C] mt-0.5">{delivery.carrier_status}</p>
            )}
          </div>
        </div>
        <p className="shrink-0 text-xs text-[#78716C]">
          {new Date(delivery.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })}
        </p>
      </div>

      <div className="mt-3 rounded-lg bg-[#FAFAF9] px-3 py-2">
        <p className="font-semibold text-[#1C1917]">{order?.customer?.name ?? '-'}</p>
        <p className="text-xs text-[#78716C]">{order?.customer?.phone}</p>
        <p className="mt-1 text-sm text-[#78716C]">
          {order?.product?.name} — <span className="font-semibold text-[#1C1917]">{order?.cod_amount} DT</span>
        </p>
      </div>

      {!selectionMode && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-xs font-medium text-[#78716C]">COD collecté</p>
            <SwitchToggle
              checked={delivery.cod_collected}
              disabled={isPending}
              onClick={() => onToggle(delivery, 'cod_collected')}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-[#78716C]">COD reversé</p>
            <SwitchToggle
              checked={delivery.cod_reversed}
              disabled={isPending || !delivery.cod_collected}
              onClick={() => onToggle(delivery, 'cod_reversed')}
              activeClass="bg-[#0B5E46]"
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-[#E7E5E4] pt-3">
        <div>
          <p className="text-xs text-[#78716C]">Frais livraison</p>
          <p className="font-semibold text-[#1C1917]">
            {delivery.fee != null ? `${delivery.fee} DT` : '-'}
          </p>
        </div>
        {!selectionMode && (
          <div className="flex gap-2">
            <button onClick={e => { e.stopPropagation(); onEdit(delivery) }} className="btn-secondary text-sm">
              Éditer
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(delivery) }}
              className="min-h-[44px] touch-manipulation rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Suppr.
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DeliveriesClient({ deliveries, shippableOrders, createDelivery, updateDelivery, deleteDelivery }: Props) {
  const [tab, setTab] = useState<Tab>('all')
  const [isPending, startTransition] = useTransition()

  const [showAdd, setShowAdd] = useState(false)
  const [addOrderId, setAddOrderId] = useState('')
  const [addCarrier, setAddCarrier] = useState<CarrierName>('intigo')
  const [addTracking, setAddTracking] = useState('')
  const [addFee, setAddFee] = useState<number | ''>('')
  const [addError, setAddError] = useState<string | null>(null)

  const [editDelivery, setEditDelivery] = useState<Delivery | null>(null)
  const [editTracking, setEditTracking] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editFee, setEditFee] = useState<number | ''>('')

  const [confirmDelete, setConfirmDelete] = useState<Delivery | null>(null)

  const router = useRouter()
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkPending, setIsBulkPending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const filtered = deliveries.filter(d => {
    if (tab === 'pending')   return !d.cod_collected
    if (tab === 'collected') return d.cod_collected && !d.cod_reversed
    if (tab === 'reversed')  return d.cod_reversed
    return true
  })

  const counts: Record<Tab, number> = {
    all:       deliveries.length,
    pending:   deliveries.filter(d => !d.cod_collected).length,
    collected: deliveries.filter(d => d.cod_collected && !d.cod_reversed).length,
    reversed:  deliveries.filter(d => d.cod_reversed).length,
  }

  const totalCollected = deliveries
    .filter(d => d.cod_collected)
    .reduce((s, d) => s + (getOrder(d)?.cod_amount ?? 0), 0)
  const totalReversed = deliveries
    .filter(d => d.cod_reversed)
    .reduce((s, d) => s + (getOrder(d)?.cod_amount ?? 0), 0)
  const totalFees = deliveries.reduce((s, d) => s + (d.fee ?? 0), 0)

  function openEdit(d: Delivery) {
    setEditDelivery(d)
    setEditTracking(d.tracking_number ?? '')
    setEditStatus(d.carrier_status ?? '')
    setEditFee(d.fee ?? '')
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addOrderId) { setAddError('Sélectionnez une commande.'); return }
    setAddError(null)
    startTransition(async () => {
      try {
        await createDelivery({
          order_id: addOrderId,
          carrier: addCarrier,
          tracking_number: addTracking.trim() || undefined,
          fee: addFee === '' ? undefined : addFee,
        })
        setShowAdd(false)
        setAddOrderId(''); setAddCarrier('intigo'); setAddTracking(''); setAddFee('')
      } catch (err) {
        setAddError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editDelivery) return
    startTransition(async () => {
      await updateDelivery(editDelivery.id, {
        tracking_number: editTracking.trim() || null,
        carrier_status:  editStatus.trim() || null,
        fee: editFee === '' ? null : editFee,
      })
      setEditDelivery(null)
    })
  }

  function handleToggle(d: Delivery, field: 'cod_collected' | 'cod_reversed') {
    startTransition(async () => {
      await updateDelivery(d.id, { [field]: !d[field] })
    })
  }

  function handleDelete(d: Delivery) {
    startTransition(async () => {
      await deleteDelivery(d.id)
      setConfirmDelete(null)
    })
  }

  async function handleBulkAction(action: 'cod_collected' | 'cod_reversed') {
    if (selectedIds.size === 0) return
    setIsBulkPending(true)
    try {
      const res = await fetch('/api/deliveries/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      })
      const data = await res.json()
      if (!res.ok) { setToast(data.error ?? 'Erreur'); return }
      const label = action === 'cod_collected' ? 'COD collecté' : 'COD reversé'
      if (data.skipped > 0) {
        setToast(`✓ ${data.updated} mise${data.updated > 1 ? 's' : ''} à jour · ${data.skipped} ignorée${data.skipped > 1 ? 's' : ''} (déjà marquée${data.skipped > 1 ? 's' : ''})`)
      } else {
        setToast(`✓ ${data.updated} livraison${data.updated > 1 ? 's' : ''} marquée${data.updated > 1 ? 's' : ''} comme ${label}`)
      }
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
          <h1 className="text-2xl font-bold text-[#1C1917]">Livraisons</h1>
          <p className="text-sm text-[#78716C] mt-0.5">{deliveries.length} livraison{deliveries.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          disabled={shippableOrders.length === 0}
          className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
          title={shippableOrders.length === 0 ? 'Aucune commande expédiée sans livraison' : ''}
        >
          + Ajouter livraison
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: 'COD collecté',   value: `${totalCollected.toFixed(0)} DT`, sub: `${counts.collected} en attente de reversal`, color: 'text-[#16A34A]' },
          { label: 'COD reversé',    value: `${totalReversed.toFixed(0)} DT`,  sub: `${counts.reversed} livraisons soldées`,      color: 'text-[#0B5E46]' },
          { label: 'Frais livreurs', value: `${totalFees.toFixed(0)} DT`,      sub: 'total transporteurs',                        color: 'text-[#1C1917]' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-2 sm:p-4">
            <p className="text-xs sm:text-sm font-medium text-[#78716C]">{s.label}</p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="hidden sm:block text-xs text-[#78716C] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Mode sélection */}
      <div className="flex items-end gap-2">
        <div className="flex-1 flex gap-0 overflow-x-auto border-b border-[#E7E5E4] scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelectionMode(false); setSelectedIds(new Set()) }}
              className={`min-h-[44px] touch-manipulation whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'text-[#166534] border-b-2 border-[#16A34A] -mb-px'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                  tab === t.key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>{counts[t.key]}</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setSelectionMode(prev => !prev); setSelectedIds(new Set()) }}
          className={`mb-px shrink-0 border rounded-lg px-3 py-1.5 text-sm transition-colors ${
            selectionMode ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-[#E7E5E4] text-[#78716C] hover:bg-[#F5F5F4]'
          }`}
        >
          {selectionMode ? 'Annuler' : 'Sélectionner'}
        </button>
      </div>

      {/* Barre d'actions bulk */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 bg-white border border-[#E7E5E4] rounded-xl px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <span className="text-sm font-medium text-[#1C1917]">
            {selectedIds.size} livraison{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => handleBulkAction('cod_collected')}
              disabled={isBulkPending}
              className="flex items-center justify-center gap-2 bg-[#16A34A] text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors hover:bg-[#15803D]"
            >
              <CheckCircle2 className="w-4 h-4" />
              COD Collecté
            </button>
            <button
              onClick={() => handleBulkAction('cod_reversed')}
              disabled={isBulkPending}
              className="flex items-center justify-center gap-2 bg-[#0B5E46] text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors hover:bg-[#0a5240]"
            >
              <ArrowDownCircle className="w-4 h-4" />
              COD Reversé
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-[#78716C] hover:text-[#1C1917] transition-colors px-2"
            >
              Désélectionner tout
            </button>
          </div>
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-8 text-center sm:p-16">
          <Truck className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-40" />
          <p className="font-medium text-[#1C1917]">
            {tab === 'all' ? 'Aucune livraison enregistrée' : 'Aucune livraison dans cette catégorie'}
          </p>
          {tab === 'all' && shippableOrders.length > 0 && (
            <button onClick={() => setShowAdd(true)} className="mt-3 text-sm text-[#16A34A] hover:text-[#15803D] font-medium">
              Ajouter la première →
            </button>
          )}
        </div>
      ) : (
        <>
        <div className="space-y-3 lg:hidden">
          {filtered.map(d => (
            <DeliveryMobileCard
              key={d.id}
              delivery={d}
              isPending={isPending}
              onToggle={handleToggle}
              onEdit={openEdit}
              onDelete={setConfirmDelete}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(d.id)}
              onSelect={toggleSelection}
            />
          ))}
        </div>

        <div className="hidden bg-white border border-[#E7E5E4] rounded-xl shadow-sm overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
              <tr>
                {selectionMode && (
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded accent-[#16A34A] cursor-pointer"
                    />
                  </th>
                )}
                {['Client / Produit', 'Transporteur', 'N° suivi / Statut', 'COD collecté', 'COD reversé', 'Frais', ''].map((h, i) => (
                  <th key={i} className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {filtered.map(d => {
                const order = getOrder(d)
                const carrier = getCarrierConfig(d.carrier)
                return (
                  <tr
                    key={d.id}
                    onClick={selectionMode ? () => toggleSelection(d.id) : undefined}
                    className={`transition-colors ${selectionMode ? 'cursor-pointer' : ''} ${selectedIds.has(d.id) ? 'bg-[#F0FDF4]' : 'hover:bg-[#FAFAF9]'}`}
                  >
                    {selectionMode && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(d.id)}
                          onChange={() => toggleSelection(d.id)}
                          className="w-4 h-4 rounded accent-[#16A34A] cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1C1917]">{order?.customer?.name ?? '—'}</p>
                      <p className="text-xs text-[#78716C]">{order?.customer?.phone}</p>
                      <p className="text-xs text-[#78716C] mt-0.5">{order?.product?.name} — <span className="font-medium">{order?.cod_amount} DT</span></p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${carrier.bg} ${carrier.color}`}>
                        {carrier.label}
                      </span>
                      <p className="text-xs text-[#78716C] mt-1">
                        {new Date(d.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {d.tracking_number ? (
                        <a
                          href={`${CARRIER_TRACKING_URLS[d.carrier]}${d.tracking_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="font-mono text-sm text-[#16A34A] underline underline-offset-2 hover:text-[#0B5E46] flex items-center gap-1"
                        >
                          {d.tracking_number}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-[#78716C]">—</span>
                      )}
                      {d.carrier_status && <p className="text-xs text-[#78716C] mt-0.5">{d.carrier_status}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {selectionMode ? (
                        <span className="text-xs text-[#78716C]">{d.cod_collected ? 'Oui' : 'Non'}</span>
                      ) : (
                        <SwitchToggle
                          checked={d.cod_collected}
                          disabled={isPending}
                          onClick={() => handleToggle(d, 'cod_collected')}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {selectionMode ? (
                        <span className="text-xs text-[#78716C]">{d.cod_reversed ? 'Oui' : 'Non'}</span>
                      ) : (
                        <SwitchToggle
                          checked={d.cod_reversed}
                          disabled={isPending || !d.cod_collected}
                          onClick={() => handleToggle(d, 'cod_reversed')}
                          activeClass="bg-[#0B5E46]"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#78716C] text-sm">
                      {d.fee != null ? `${d.fee} DT` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {!selectionMode && (
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(d)} className="text-xs text-[#16A34A] hover:text-[#15803D] font-medium">
                            Éditer
                          </button>
                          <button onClick={() => setConfirmDelete(d)} className="text-xs text-red-400 hover:text-red-600 font-medium">
                            Suppr.
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

      {/* ── ADD MODAL ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="flex min-h-[100svh] w-full flex-col bg-white shadow-xl sm:min-h-0 sm:max-w-md sm:rounded-xl sm:border sm:border-[#E7E5E4]">
            <div className="sticky top-0 border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6">
              <h3 className="font-semibold text-[#1C1917] text-lg">Nouvelle livraison</h3>
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
                  <input className="input" value={addTracking} onChange={e => setAddTracking(e.target.value)} placeholder="Optionnel" />
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

      {/* ── EDIT MODAL ── */}
      {editDelivery && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="flex min-h-[100svh] w-full flex-col bg-white shadow-xl sm:min-h-0 sm:max-w-sm sm:rounded-xl sm:border sm:border-[#E7E5E4]">
            <div className="sticky top-0 border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6">
              <h3 className="font-semibold text-[#1C1917] text-lg">Modifier la livraison</h3>
            </div>
            <form onSubmit={handleEditSave} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
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

      {/* ── DELETE CONFIRM ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="flex min-h-[100svh] w-full flex-col bg-white shadow-xl sm:min-h-0 sm:max-w-sm sm:rounded-xl sm:border sm:border-[#E7E5E4]">
            <div className="sticky top-0 border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6">
              <h3 className="font-semibold text-[#1C1917]">Supprimer cette livraison ?</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <p className="text-sm text-[#78716C]">
              {getOrder(confirmDelete)?.customer?.name} — {getCarrierConfig(confirmDelete.carrier).label}
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

      {/* Toast confirmation bulk */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1C1917] text-white px-4 py-2 rounded-full text-sm shadow-lg whitespace-nowrap pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
