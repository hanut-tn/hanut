'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Package, Trash2 } from 'lucide-react'
import type { OrderStatus } from '@hanut/types'
import type { UserRole } from '@/lib/get-context'

const STATUS_CONFIG: Record<OrderStatus, { label: string; cls: string; dot: string }> = {
  pending:  { label: 'En attente',  cls: 'bg-amber-50 text-amber-700 border border-amber-200',    dot: 'bg-amber-400' },
  new:      { label: 'Nouvelle',    cls: 'bg-blue-50 text-blue-700 border border-blue-200',        dot: 'bg-blue-400' },
  confirmed:{ label: 'Confirmée',   cls: 'bg-violet-50 text-violet-700 border border-violet-200',  dot: 'bg-violet-400' },
  shipped:  { label: 'Expédiée',    cls: 'bg-orange-50 text-orange-700 border border-orange-200',  dot: 'bg-orange-400' },
  delivered:{ label: 'Livrée',      cls: 'bg-green-50 text-green-700 border border-green-200',     dot: 'bg-green-400' },
  returned: { label: 'Retournée',   cls: 'bg-red-50 text-red-700 border border-red-200',           dot: 'bg-red-400' },
}

const DELETABLE_STATUSES: OrderStatus[] = ['pending', 'new', 'returned']

const STATUS_FLOW: OrderStatus[] = ['new', 'confirmed', 'shipped', 'delivered', 'returned']

const TABS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'Toutes',      value: 'all' },
  { label: 'En attente',  value: 'pending' },
  { label: 'Nouvelles',   value: 'new' },
  { label: 'Confirmées',  value: 'confirmed' },
  { label: 'Expédiées',   value: 'shipped' },
  { label: 'Livrées',     value: 'delivered' },
  { label: 'Retournées',  value: 'returned' },
]

type Order = {
  id: string
  cod_amount: number
  status: OrderStatus
  variant?: string
  quantity: number
  notes?: string
  created_at: string
  customer: { id: string; name: string; phone: string; city?: string } | { id: string; name: string; phone: string; city?: string }[] | null
  product: { id: string; name: string; price: number } | { id: string; name: string; price: number }[] | null
}

type TrashOrder = {
  id: string
  cod_amount: number
  status: OrderStatus
  variant?: string
  quantity: number
  deleted_at: string
  customer: { id: string; name: string; phone: string; city?: string } | null | any[]
  product: { id: string; name: string; price: number } | null | any[]
}

type Props = {
  role: UserRole
  orders: Order[]
  trashOrders: TrashOrder[]
  updateStatus: (id: string, status: OrderStatus) => Promise<void>
  deleteOrder: (id: string) => Promise<{ error?: string }>
  confirmOrder: (id: string) => Promise<void>
  cancelPendingOrder: (id: string) => Promise<void>
  restoreOrder: (id: string) => Promise<{ error?: string }>
  permanentlyDeleteOrder: (id: string) => Promise<{ error?: string }>
}

export default function OrdersClient({
  role,
  orders,
  trashOrders,
  updateStatus,
  deleteOrder,
  confirmOrder,
  cancelPendingOrder,
  restoreOrder,
  permanentlyDeleteOrder,
}: Props) {
  const [tab, setTab] = useState<OrderStatus | 'all' | 'trash'>('all')
  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null)
  const [confirmPermDelete, setConfirmPermDelete] = useState<TrashOrder | null>(null)
  const [permDeleteInput, setPermDeleteInput] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isAdmin = role === 'admin'

  const filtered = tab === 'all' || tab === 'trash'
    ? orders
    : orders.filter(o => o.status === tab)
  const displayedOrders = tab === 'trash' ? [] : (tab === 'all' ? orders : filtered)
  const displayedTrash = tab === 'trash' ? trashOrders : []

  const counts: Partial<Record<OrderStatus | 'all', number>> = { all: orders.length }
  for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1

  function handleStatus(orderId: string, status: OrderStatus) {
    startTransition(async () => {
      await updateStatus(orderId, status)
      setOpenMenu(null)
    })
  }

  function handleConfirm(orderId: string) {
    startTransition(async () => { await confirmOrder(orderId) })
  }

  function handleCancel(orderId: string) {
    startTransition(async () => { await cancelPendingOrder(orderId) })
  }

  function handleDelete(id: string) {
    setActionError(null)
    startTransition(async () => {
      const result = await deleteOrder(id)
      if (result?.error) {
        setActionError(result.error)
        return
      }
      setConfirmDelete(null)
    })
  }

  function handleRestore(id: string) {
    setActionError(null)
    startTransition(async () => {
      const result = await restoreOrder(id)
      if (result?.error) setActionError(result.error)
    })
  }

  function handlePermanentDelete(id: string) {
    setActionError(null)
    startTransition(async () => {
      const result = await permanentlyDeleteOrder(id)
      if (result?.error) {
        setActionError(result.error)
        return
      }
      setConfirmPermDelete(null)
      setPermDeleteInput('')
    })
  }

  const pendingCount = counts['pending'] ?? 0

  function getCustomer(order: Order | TrashOrder) {
    return Array.isArray(order.customer) ? order.customer[0] : order.customer
  }

  function getProduct(order: Order | TrashOrder) {
    return Array.isArray(order.product) ? order.product[0] : order.product
  }

  function daysUntilExpiry(deletedAt: string) {
    const deleteDate = new Date(deletedAt)
    const expiryDate = new Date(deleteDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    return Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Commandes</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            {orders.length} commande{orders.length !== 1 ? 's' : ''}
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-semibold">
                · {pendingCount} en attente de confirmation
              </span>
            )}
          </p>
        </div>
        <Link href="/orders/new" className="btn-primary text-sm">+ Nouvelle commande</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E7E5E4]">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              tab === t.value
                ? 'text-[#166534] border-b-2 border-[#16A34A] -mb-px'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            {t.label}
            {counts[t.value] ? (
              <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                t.value === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : tab === t.value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {counts[t.value]}
              </span>
            ) : null}
          </button>
        ))}

        {/* Onglet Corbeille — admins uniquement */}
        {isAdmin && (
          <button
            onClick={() => setTab('trash')}
            className={`ml-auto flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors relative ${
              tab === 'trash'
                ? 'text-red-600 border-b-2 border-red-400 -mb-px'
                : 'text-[#78716C] hover:text-red-500'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Corbeille
            {trashOrders.length > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                tab === 'trash' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {trashOrders.length}
              </span>
            )}
          </button>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700">
          {actionError}
        </div>
      )}

      {/* Vue normale */}
      {tab !== 'trash' && (
        displayedOrders.length === 0 ? (
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-16 text-center">
            <Package className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-40" />
            <p className="font-medium text-[#1C1917]">Aucune commande{tab !== 'all' ? ' dans cette catégorie' : ''}</p>
            {tab === 'all' && (
              <Link href="/orders/new" className="mt-3 inline-block text-sm text-[#16A34A] hover:text-[#15803D] font-medium">
                Créer la première →
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm overflow-visible">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
                <tr>
                  {['Client', 'Produit', 'Montant', 'Statut', 'Date', ''].map((h, i) => (
                    <th key={i} className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4]">
                {displayedOrders.map(order => {
                  const st = STATUS_CONFIG[order.status]
                  const customer = getCustomer(order)
                  const product = getProduct(order)
                  const isPendingOrder = order.status === 'pending'
                  const canDelete = isAdmin && DELETABLE_STATUSES.includes(order.status)

                  return (
                    <tr
                      key={order.id}
                      className={`transition-colors ${isPendingOrder ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-[#FAFAF9]'}`}
                    >
                      <td className="px-5 py-4">
                        {isPendingOrder && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold mb-0.5">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                            Via lien public
                          </span>
                        )}
                        <p className="font-medium text-[#1C1917]">{customer?.name ?? '—'}</p>
                        <p className="text-xs text-[#78716C]">{customer?.phone}</p>
                        {customer?.city && <p className="text-xs text-[#78716C]">{customer.city}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[#1C1917]">{product?.name ?? '—'}</p>
                        {order.variant && <p className="text-xs text-[#78716C]">{order.variant}</p>}
                        {order.quantity > 1 && <p className="text-xs text-[#78716C]">× {order.quantity}</p>}
                      </td>
                      <td className="px-5 py-4 font-semibold text-[#1C1917]">{order.cod_amount} DT</td>
                      <td className="px-5 py-4 relative">
                        {isPendingOrder ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${st.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot} animate-pulse`} />
                            {st.label}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => setOpenMenu(openMenu === order.id ? null : order.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity ${st.cls}`}
                            >
                              {st.label}
                              <span className="text-[10px]">▾</span>
                            </button>
                            {openMenu === order.id && (
                              <div className="absolute left-5 top-12 z-50 bg-white rounded-xl shadow-xl border border-[#E7E5E4] py-1.5 min-w-[170px]">
                                {STATUS_FLOW.map(s => {
                                  const sc = STATUS_CONFIG[s]
                                  return (
                                    <button
                                      key={s}
                                      disabled={s === order.status || isPending}
                                      onClick={() => handleStatus(order.id, s)}
                                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2.5 hover:bg-[#F5F5F4] disabled:opacity-40 disabled:cursor-default transition-colors"
                                    >
                                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                                      <span className={s === order.status ? 'font-semibold text-[#1C1917]' : 'text-[#78716C]'}>
                                        {sc.label}
                                      </span>
                                      {s === order.status && <span className="ml-auto text-xs text-[#78716C]">actuel</span>}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-[#78716C] whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('fr-TN', {
                          day: '2-digit', month: 'short', year: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-4">
                        {isPendingOrder ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirm(order.id)}
                              disabled={isPending}
                              className="text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => handleCancel(order.id)}
                              disabled={isPending}
                              className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 hover:border-red-300 disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              Annuler
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => { setConfirmDelete(order); setActionError(null) }}
                                className="text-xs font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition-colors"
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        ) : canDelete ? (
                          <button
                            onClick={() => { setConfirmDelete(order); setActionError(null) }}
                            className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors"
                          >
                            Supprimer
                          </button>
                        ) : (
                          <Link href={`/orders/${order.id}`} className="text-sm text-[#78716C] hover:text-[#1C1917] transition-colors">
                            Voir →
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Vue Corbeille */}
      {tab === 'trash' && (
        displayedTrash.length === 0 ? (
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-16 text-center">
            <Trash2 className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-40" />
            <p className="font-medium text-[#1C1917]">La corbeille est vide</p>
            <p className="text-sm text-[#78716C] mt-1">Les commandes supprimées apparaissent ici pendant 30 jours.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-red-50 border-b border-red-100">
              <p className="text-xs text-red-600 font-medium">
                Les commandes en corbeille sont restaurables pendant 30 jours.
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
                <tr>
                  {['Client', 'Produit', 'Montant', 'Statut', 'Supprimé le', ''].map((h, i) => (
                    <th key={i} className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4]">
                {displayedTrash.map(order => {
                  const st = STATUS_CONFIG[order.status]
                  const customer = getCustomer(order)
                  const product = getProduct(order)
                  const daysLeft = daysUntilExpiry(order.deleted_at)

                  return (
                    <tr key={order.id} className="hover:bg-red-50/30 transition-colors opacity-80">
                      <td className="px-5 py-4">
                        <p className="font-medium text-[#1C1917]">{customer?.name ?? '—'}</p>
                        <p className="text-xs text-[#78716C]">{customer?.phone}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[#1C1917]">{product?.name ?? '—'}</p>
                        {order.variant && <p className="text-xs text-[#78716C]">{order.variant}</p>}
                      </td>
                      <td className="px-5 py-4 font-semibold text-[#1C1917]">{order.cod_amount} DT</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-[#78716C]">
                        <p>{new Date(order.deleted_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                        {daysLeft <= 7 && (
                          <span className="text-red-500 font-medium">Expire dans {daysLeft}j</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleRestore(order.id)}
                            disabled={isPending}
                            className="text-xs font-semibold text-[#16A34A] hover:text-[#15803D] disabled:opacity-50 transition-colors"
                          >
                            Restaurer
                          </button>
                          <button
                            onClick={() => { setConfirmPermDelete(order); setPermDeleteInput(''); setActionError(null) }}
                            className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors"
                          >
                            Supprimer définitivement
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {openMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
      )}

      {/* Modale — déplacer vers la corbeille */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-[#1C1917] mb-1">Supprimer cette commande ?</h3>
            <p className="text-sm text-[#78716C] mb-3">
              Cette commande sera déplacée dans la corbeille. Vous pourrez la restaurer pendant 30 jours.
            </p>
            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-5 space-y-0.5 text-sm">
              <p className="font-medium text-[#1C1917]">{getCustomer(confirmDelete)?.name ?? '—'}</p>
              <p className="text-[#78716C]">{getProduct(confirmDelete)?.name ?? '—'}</p>
              <p className="font-semibold text-[#1C1917]">{confirmDelete.cod_amount} DT</p>
            </div>
            {actionError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {actionError}
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                disabled={isPending}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Déplacement...' : 'Déplacer vers la corbeille'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale — suppression définitive */}
      {confirmPermDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-red-700 mb-1">Suppression définitive</h3>
            <p className="text-sm text-[#78716C] mb-3">
              Cette action est irréversible. La commande sera définitivement perdue.
            </p>
            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4 space-y-0.5 text-sm">
              <p className="font-medium text-[#1C1917]">{getCustomer(confirmPermDelete)?.name ?? '—'}</p>
              <p className="text-[#78716C]">{getProduct(confirmPermDelete)?.name ?? '—'}</p>
              <p className="font-semibold text-[#1C1917]">{confirmPermDelete.cod_amount} DT</p>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Tapez <span className="font-mono font-bold text-red-600">SUPPRIMER</span> pour confirmer
              </label>
              <input
                className="input"
                value={permDeleteInput}
                onChange={e => setPermDeleteInput(e.target.value)}
                placeholder="SUPPRIMER"
                autoFocus
              />
            </div>
            {actionError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {actionError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmPermDelete(null); setPermDeleteInput('') }}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                onClick={() => handlePermanentDelete(confirmPermDelete.id)}
                disabled={isPending || permDeleteInput !== 'SUPPRIMER'}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
