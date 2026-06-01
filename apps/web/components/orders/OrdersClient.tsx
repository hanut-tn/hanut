'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { OrderStatus } from '@hanut/types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; cls: string; dot: string }> = {
  pending:  { label: 'En attente',  cls: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-400' },
  new:      { label: 'Nouvelle',    cls: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-400' },
  confirmed:{ label: 'Confirmée',   cls: 'bg-yellow-100 text-yellow-700',   dot: 'bg-yellow-400' },
  shipped:  { label: 'Expédiée',    cls: 'bg-purple-100 text-purple-700',   dot: 'bg-purple-400' },
  delivered:{ label: 'Livrée',      cls: 'bg-green-100 text-green-700',     dot: 'bg-green-400' },
  returned: { label: 'Retournée',   cls: 'bg-red-100 text-red-700',         dot: 'bg-red-400' },
}

// Excludes pending — vendors can't manually set an order to pending
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

type Props = {
  orders: Order[]
  updateStatus: (id: string, status: OrderStatus) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
  confirmOrder: (id: string) => Promise<void>
  cancelPendingOrder: (id: string) => Promise<void>
}

export default function OrdersClient({ orders, updateStatus, deleteOrder, confirmOrder, cancelPendingOrder }: Props) {
  const [tab, setTab] = useState<OrderStatus | 'all'>('all')
  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = tab === 'all' ? orders : orders.filter(o => o.status === tab)

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
    startTransition(async () => {
      await deleteOrder(id)
      setConfirmDelete(null)
    })
  }

  const pendingCount = counts['pending'] ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {orders.length} commande{orders.length !== 1 ? 's' : ''}
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-orange-600 font-semibold">
                · {pendingCount} en attente de confirmation
              </span>
            )}
          </p>
        </div>
        <Link href="/orders/new" className="btn-primary">+ Nouvelle commande</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {counts[t.value] ? (
              <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                t.value === 'pending'
                  ? tab === t.value ? 'bg-orange-100 text-orange-600' : 'bg-orange-100 text-orange-500'
                  : tab === t.value ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {counts[t.value]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Empty */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <p className="text-5xl mb-4">📦</p>
          <p className="font-medium text-gray-600">Aucune commande{tab !== 'all' ? ' dans cette catégorie' : ''}</p>
          {tab === 'all' && (
            <Link href="/orders/new" className="mt-3 inline-block text-sm text-brand-600 hover:text-brand-700 font-medium">
              Créer la première →
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-visible">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Client', 'Produit', 'Montant', 'Statut', 'Date', ''].map((h, i) => (
                  <th key={i} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(order => {
                const st = STATUS_CONFIG[order.status]
                const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer
                const product  = Array.isArray(order.product)  ? order.product[0]  : order.product
                const isPendingOrder = order.status === 'pending'

                return (
                  <tr
                    key={order.id}
                    className={`transition-colors ${
                      isPendingOrder ? 'bg-orange-50/40 hover:bg-orange-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-5 py-4">
                      {isPendingOrder && (
                        <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-semibold mb-0.5">
                          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                          Via lien public
                        </span>
                      )}
                      <p className="font-medium text-gray-900">{customer?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{customer?.phone}</p>
                      {customer?.city && <p className="text-xs text-gray-400">{customer.city}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-gray-700">{product?.name ?? '—'}</p>
                      {order.variant && <p className="text-xs text-gray-400">{order.variant}</p>}
                      {order.quantity > 1 && <p className="text-xs text-gray-400">× {order.quantity}</p>}
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900">{order.cod_amount} DT</td>
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
                            <div className="absolute left-5 top-12 z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 min-w-[170px]">
                              {STATUS_FLOW.map(s => {
                                const sc = STATUS_CONFIG[s]
                                return (
                                  <button
                                    key={s}
                                    disabled={s === order.status || isPending}
                                    onClick={() => handleStatus(order.id, s)}
                                    className="w-full text-left px-4 py-2 text-sm flex items-center gap-2.5 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default transition-colors"
                                  >
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                                    <span className={s === order.status ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                                      {sc.label}
                                    </span>
                                    {s === order.status && <span className="ml-auto text-xs text-gray-400">actuel</span>}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
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
                            className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-colors"
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
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(order)}
                          className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors"
                        >
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {openMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-1">Supprimer cette commande ?</h3>
            <p className="text-sm text-gray-500 mb-5">
              {(Array.isArray(confirmDelete.customer) ? confirmDelete.customer[0] : confirmDelete.customer)?.name ?? 'Client'} — {confirmDelete.cod_amount} DT
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
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
