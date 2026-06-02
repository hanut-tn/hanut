'use client'

import { useState, useTransition } from 'react'
import { Truck } from 'lucide-react'
import type { CarrierName } from '@hanut/types'
import type { CreateDeliveryInput, UpdateDeliveryInput } from '@/app/(dashboard)/deliveries/actions'

const CARRIERS: { value: CarrierName; label: string }[] = [
  { value: 'intigo',       label: 'IntiGo' },
  { value: 'navex',        label: 'Navex' },
  { value: 'adex',         label: 'Adex' },
  { value: 'aramex',       label: 'Aramex' },
  { value: 'bestdelivery', label: 'BestDelivery' },
]

const CARRIER_STYLE: Record<CarrierName, string> = {
  intigo:       'bg-blue-100 text-blue-700',
  navex:        'bg-green-100 text-green-700',
  adex:         'bg-orange-100 text-orange-700',
  aramex:       'bg-red-100 text-red-700',
  bestdelivery: 'bg-sky-100 text-sky-700',
}

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Livraisons</h1>
          <p className="text-sm text-[#78716C] mt-0.5">{deliveries.length} livraison{deliveries.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          disabled={shippableOrders.length === 0}
          className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title={shippableOrders.length === 0 ? 'Aucune commande expédiée sans livraison' : ''}
        >
          + Ajouter livraison
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'COD collecté',   value: `${totalCollected.toFixed(0)} DT`, sub: `${counts.collected} en attente de reversal`, color: 'text-[#16A34A]' },
          { label: 'COD reversé',    value: `${totalReversed.toFixed(0)} DT`,  sub: `${counts.reversed} livraisons soldées`,      color: 'text-[#0B5E46]' },
          { label: 'Frais livreurs', value: `${totalFees.toFixed(0)} DT`,      sub: 'total transporteurs',                        color: 'text-[#1C1917]' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-4">
            <p className="text-sm font-medium text-[#78716C]">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[#78716C] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs — underline style */}
      <div className="flex gap-0 border-b border-[#E7E5E4]">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
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

      {/* Empty */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-16 text-center">
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
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
              <tr>
                {['Client / Produit', 'Transporteur', 'N° suivi / Statut', 'COD collecté', 'COD reversé', 'Frais', ''].map((h, i) => (
                  <th key={i} className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {filtered.map(d => {
                const order = getOrder(d)
                const cStyle = CARRIER_STYLE[d.carrier]
                const cLabel = CARRIERS.find(c => c.value === d.carrier)?.label ?? d.carrier
                return (
                  <tr key={d.id} className="hover:bg-[#FAFAF9] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1C1917]">{order?.customer?.name ?? '—'}</p>
                      <p className="text-xs text-[#78716C]">{order?.customer?.phone}</p>
                      <p className="text-xs text-[#78716C] mt-0.5">{order?.product?.name} — <span className="font-medium">{order?.cod_amount} DT</span></p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${cStyle}`}>
                        {cLabel}
                      </span>
                      <p className="text-xs text-[#78716C] mt-1">
                        {new Date(d.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-[#1C1917]">{d.tracking_number || <span className="text-[#78716C] font-sans">—</span>}</p>
                      {d.carrier_status && <p className="text-xs text-[#78716C] mt-0.5">{d.carrier_status}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(d, 'cod_collected')}
                        disabled={isPending}
                        className={`w-9 h-5 rounded-full transition-colors relative disabled:opacity-60 ${
                          d.cod_collected ? 'bg-[#16A34A]' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          d.cod_collected ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(d, 'cod_reversed')}
                        disabled={isPending || !d.cod_collected}
                        className={`w-9 h-5 rounded-full transition-colors relative disabled:opacity-40 ${
                          d.cod_reversed ? 'bg-[#0B5E46]' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          d.cod_reversed ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[#78716C] text-sm">
                      {d.fee != null ? `${d.fee} DT` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(d)} className="text-xs text-[#16A34A] hover:text-[#15803D] font-medium">
                          Éditer
                        </button>
                        <button onClick={() => setConfirmDelete(d)} className="text-xs text-red-400 hover:text-red-600 font-medium">
                          Suppr.
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ADD MODAL ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-semibold text-[#1C1917] text-lg">Nouvelle livraison</h3>
            <form onSubmit={handleAdd} className="space-y-4">
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
                  {CARRIERS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              <div className="flex gap-3 pt-1">
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-semibold text-[#1C1917] text-lg">Modifier la livraison</h3>
            <form onSubmit={handleEditSave} className="space-y-4">
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
              <div className="flex gap-3 pt-1">
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-[#1C1917] mb-1">Supprimer cette livraison ?</h3>
            <p className="text-sm text-[#78716C] mb-5">
              {getOrder(confirmDelete)?.customer?.name} — {CARRIERS.find(c => c.value === confirmDelete.carrier)?.label}
            </p>
            <div className="flex gap-3">
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
    </div>
  )
}
