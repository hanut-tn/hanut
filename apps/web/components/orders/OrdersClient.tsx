'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import Link from 'next/link'
import {
  Search, SearchX, Download, Trash2, ChevronRight, ShoppingBag, Filter,
  X, Loader2,
} from 'lucide-react'
import type { OrderStatus } from '@hanut/types'
import type { UserRole } from '@/lib/get-context'
import { DELETABLE_STATUSES, ORDER_STATUS_LABELS } from '@/lib/constants'
import { StatusBadge } from '@/components/ui/StatusBadge'

const TABS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'Toutes',     value: 'all' },
  { label: 'En attente', value: 'pending' },
  { label: 'Nouvelles',  value: 'new' },
  { label: 'Confirmées', value: 'confirmed' },
  { label: 'Expédiées',  value: 'shipped' },
  { label: 'Livrées',    value: 'delivered' },
  { label: 'Retournées', value: 'returned' },
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
  plan: 'starter' | 'pro' | 'business'
  orders: Order[]
  trashOrders: TrashOrder[]
  updateStatus: (id: string, status: OrderStatus) => Promise<void>
  deleteOrder: (id: string) => Promise<{ error?: string }>
  confirmOrder: (id: string) => Promise<void>
  cancelPendingOrder: (id: string) => Promise<void>
  restoreOrder: (id: string) => Promise<{ error?: string }>
  permanentlyDeleteOrder: (id: string) => Promise<{ error?: string }>
}

function getCustomer(order: Order | TrashOrder) {
  return Array.isArray(order.customer) ? order.customer[0] : order.customer
}

function getProduct(order: Order | TrashOrder) {
  return Array.isArray(order.product) ? order.product[0] : order.product
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'à l’instant'
  if (diffMins < 60) return `il y a ${diffMins}min`
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays === 1) return 'hier'
  return date.toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })
}

function daysUntilExpiry(deletedAt: string) {
  const expiryDate = new Date(new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000)
  return Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>
  const lower = text.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 not-italic rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function exportCSV(orders: Order[]) {
  const rows = orders.map(o => {
    const customer = getCustomer(o)
    const product = getProduct(o)
    return [
      o.id.slice(0, 8),
      customer?.name ?? '',
      customer?.phone ?? '',
      customer?.city ?? '',
      product?.name ?? '',
      o.variant ?? '',
      o.quantity,
      o.cod_amount,
      ORDER_STATUS_LABELS[o.status],
      new Date(o.created_at).toLocaleDateString('fr-TN'),
    ].join(';')
  })
  const csv = ['ID;Client;Téléphone;Ville;Produit;Variante;Qté;COD (DT);Statut;Date', ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function OrdersClient({
  role,
  plan,
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
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Order[] | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null)
  const [confirmPermDelete, setConfirmPermDelete] = useState<TrashOrder | null>(null)
  const [permDeleteInput, setPermDeleteInput] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Debounce : met à jour debouncedSearch 300ms après la frappe
  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) {
      setDebouncedSearch('')
      setSearchResults(null)
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const timer = setTimeout(() => setDebouncedSearch(q), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch côté serveur quand debouncedSearch change
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) return
    const controller = new AbortController()
    fetch(`/api/orders?search=${encodeURIComponent(debouncedSearch)}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { setSearchResults(data.orders ?? []); setIsSearching(false) })
      .catch(() => { setIsSearching(false) })
    return () => controller.abort()
  }, [debouncedSearch])

  const isAdmin = role === 'admin'
  const canExport = plan === 'pro' || plan === 'business'

  const counts = useMemo(() => {
    const c: Partial<Record<OrderStatus | 'all', number>> = { all: orders.length }
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [orders])

  const filteredOrders = useMemo(() => {
    const base = searchResults !== null ? searchResults : orders
    if (tab === 'all' || tab === 'trash') return base
    return base.filter(o => o.status === tab)
  }, [orders, searchResults, tab])

  function handleStatus(orderId: string, status: OrderStatus) {
    startTransition(async () => { await updateStatus(orderId, status) })
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
      if (result?.error) { setActionError(result.error); return }
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
      if (result?.error) { setActionError(result.error); return }
      setConfirmPermDelete(null)
      setPermDeleteInput('')
    })
  }

  const displayedTrash = tab === 'trash' ? trashOrders : []
  const pendingCount = counts['pending'] ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#1C1917]">Commandes</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            {orders.length} commande{orders.length !== 1 ? 's' : ''} au total
            {pendingCount > 0 && (
              <span className="ml-2 text-amber-600 font-semibold">
                · {pendingCount} en attente
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C] animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
            )}
            <input
              className="pl-9 pr-8 py-2 text-sm bg-white border border-[#E7E5E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] w-52 transition-all placeholder:text-[#A8A29E]"
              placeholder="Rechercher par nom, téléphone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setDebouncedSearch(''); setSearchResults(null); setIsSearching(false) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#78716C] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Export CSV */}
          <div className="relative group">
            <button
              onClick={() => canExport && exportCSV(filteredOrders)}
              disabled={!canExport}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                canExport
                  ? 'border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917] hover:border-[#D6D3D1] bg-white'
                  : 'border-[#E7E5E4] text-[#A8A29E] bg-[#FAFAF9] cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
            {!canExport && (
              <div className="absolute bottom-full mb-1.5 right-0 whitespace-nowrap bg-[#1C1917] text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Disponible en plan Pro
              </div>
            )}
          </div>

          <Link href="/orders/new" className="btn-primary text-sm whitespace-nowrap">
            + Nouvelle commande
          </Link>
        </div>
      </div>

      {/* Badge recherche active */}
      {debouncedSearch && (
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] px-2.5 py-1 rounded-full">
            Recherche&nbsp;: <strong>{debouncedSearch}</strong>
            <button
              onClick={() => { setSearch(''); setDebouncedSearch(''); setSearchResults(null) }}
              className="ml-0.5 hover:text-[#0B5E46] transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
          {searchResults !== null && !isSearching && (
            <span className="text-xs text-[#78716C]">
              {searchResults.length} résultat{searchResults.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E7E5E4] overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
              tab === t.value
                ? 'text-[#166534] border-b-2 border-[#16A34A] -mb-px'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            {t.label}
            <span className={`ml-1 ${
              t.value === 'pending'
                ? 'text-amber-600'
                : tab === t.value ? 'text-[#16A34A]' : 'text-[#A8A29E]'
            }`}>
              ({counts[t.value] ?? 0})
            </span>
          </button>
        ))}

        {isAdmin && (
          <button
            onClick={() => setTab('trash')}
            className={`ml-auto flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
              tab === 'trash'
                ? 'text-red-600 border-b-2 border-red-400 -mb-px'
                : 'text-[#78716C] hover:text-red-500'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Corbeille
            <span className={tab === 'trash' ? 'text-red-600' : 'text-[#A8A29E]'}>
              ({trashOrders.length})
            </span>
          </button>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700">
          {actionError}
        </div>
      )}

      {/* Liste commandes */}
      {tab !== 'trash' && (
        filteredOrders.length === 0 ? (
          debouncedSearch ? (
            /* État vide — recherche sans résultats */
            <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-16 text-center">
              <SearchX className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-30" />
              <p className="font-medium text-[#1C1917]">
                Aucune commande pour <strong>&ldquo;{debouncedSearch}&rdquo;</strong>
              </p>
              <button
                onClick={() => { setSearch(''); setDebouncedSearch(''); setSearchResults(null) }}
                className="mt-3 text-sm text-[#16A34A] hover:text-[#15803D] font-medium transition-colors"
              >
                Effacer la recherche
              </button>
            </div>
          ) : tab === 'all' && orders.length === 0 ? (
            /* État vide — aucune commande du tout */
            <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-16 text-center">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-[#78716C] opacity-30" />
              <p className="font-semibold text-[#1C1917] mb-1">Aucune commande pour l&apos;instant</p>
              <p className="text-sm text-[#78716C] mb-6">
                Partagez votre lien de commande ou créez votre première commande
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/orders/new" className="btn-primary text-sm">
                  + Nouvelle commande
                </Link>
              </div>
            </div>
          ) : (
            /* État vide — filtre statut sans résultats */
            <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-16 text-center">
              <Filter className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-30" />
              <p className="font-medium text-[#1C1917]">Aucune commande avec ce statut</p>
              <button
                onClick={() => setTab('all')}
                className="mt-3 text-sm text-[#16A34A] hover:text-[#15803D] font-medium transition-colors"
              >
                Voir toutes les commandes
              </button>
            </div>
          )
        ) : (
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm overflow-hidden">
            {/* En-têtes colonnes */}
            <div className="grid grid-cols-[40px_1fr_1fr_120px_100px_140px] gap-4 items-center px-5 py-3 bg-[#FAFAF9] border-b border-[#E7E5E4]">
              <div />
              <p className="text-xs font-medium text-[#78716C] uppercase tracking-wider">Client</p>
              <p className="text-xs font-medium text-[#78716C] uppercase tracking-wider">Produit</p>
              <p className="text-xs font-medium text-[#78716C] uppercase tracking-wider">Statut</p>
              <p className="text-xs font-medium text-[#78716C] uppercase tracking-wider text-right">Montant</p>
              <p className="text-xs font-medium text-[#78716C] uppercase tracking-wider text-right">Actions</p>
            </div>

            {/* Lignes */}
            <div className="divide-y divide-[#E7E5E4]">
              {filteredOrders.map(order => {
                const customer = getCustomer(order)
                const product = getProduct(order)
                const isPendingOrder = order.status === 'pending'
                const isNew = order.status === 'new'
                const isConfirmed = order.status === 'confirmed'
                const isShipped = order.status === 'shipped'
                const canDelete = isAdmin && DELETABLE_STATUSES.includes(order.status)
                const ini = customer?.name ? initials(customer.name) : '?'

                return (
                  <div
                    key={order.id}
                    className={`group grid grid-cols-[40px_1fr_1fr_120px_100px_140px] gap-4 items-center px-5 py-4 transition-colors cursor-pointer ${
                      isPendingOrder ? 'bg-amber-50/20 hover:bg-amber-50/50' : 'hover:bg-[#FAFAF9]'
                    }`}
                    onClick={() => window.location.href = `/orders/${order.id}`}
                  >
                    {/* Col 1 — Avatar */}
                    <div className="w-9 h-9 rounded-full bg-[#F0FDF4] text-[#166534] flex items-center justify-center font-semibold text-sm shrink-0 select-none">
                      {ini}
                    </div>

                    {/* Col 2 — Client */}
                    <div className="min-w-0">
                      {isPendingOrder && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold mb-0.5">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                          Via lien public
                        </span>
                      )}
                      <p className="text-sm font-semibold text-[#1C1917] truncate">
                        {customer?.name
                          ? <Highlight text={customer.name} query={debouncedSearch} />
                          : '—'}
                      </p>
                      <p className="text-xs text-[#78716C] truncate">
                        {customer?.phone
                          ? <Highlight text={customer.phone} query={debouncedSearch} />
                          : ''}
                        {customer?.city ? ` · ${customer.city}` : ''}
                      </p>
                      <p className="text-xs text-[#A8A29E]">{relativeDate(order.created_at)}</p>
                    </div>

                    {/* Col 3 — Produit */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1C1917] truncate">{product?.name ?? '—'}</p>
                      <p className="text-xs text-[#78716C] truncate">
                        {[order.variant, order.quantity > 1 ? `× ${order.quantity}` : ''].filter(Boolean).join(' · ')}
                      </p>
                    </div>

                    {/* Col 4 — Statut */}
                    <div>
                      <StatusBadge status={order.status} pulseDot={isPendingOrder} />
                    </div>

                    {/* Col 5 — Montant */}
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#16A34A]">{order.cod_amount} DT</p>
                      <p className="text-xs text-[#78716C]">COD</p>
                    </div>

                    {/* Col 6 — Actions */}
                    <div
                      className="flex items-center justify-end gap-1.5"
                      onClick={e => e.stopPropagation()}
                    >
                      {(isPendingOrder || isNew) && (
                        <button
                          onClick={() => isPendingOrder ? handleConfirm(order.id) : handleStatus(order.id, 'confirmed')}
                          disabled={isPending}
                          className="text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Confirmer
                        </button>
                      )}
                      {isPendingOrder && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          disabled={isPending}
                          className="text-xs font-semibold text-red-600 border border-red-200 hover:border-red-300 disabled:opacity-50 px-2 py-1.5 rounded-lg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isConfirmed && (
                        <button
                          onClick={() => handleStatus(order.id, 'shipped')}
                          disabled={isPending}
                          className="text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Expédier
                        </button>
                      )}
                      {isShipped && (
                        <button
                          onClick={() => handleStatus(order.id, 'delivered')}
                          disabled={isPending}
                          className="text-xs font-semibold text-white bg-[#0B5E46] hover:bg-[#0a5240] disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Livré
                        </button>
                      )}
                      {canDelete && !isPendingOrder && (
                        <button
                          onClick={() => { setConfirmDelete(order); setActionError(null) }}
                          className="text-xs font-medium text-[#A8A29E] hover:text-red-500 px-1.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Link
                        href={`/orders/${order.id}`}
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-[#78716C] hover:text-[#1C1917] hover:bg-[#F0F0EF] transition-colors shrink-0"
                        onClick={e => e.stopPropagation()}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
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
            <div className="divide-y divide-[#E7E5E4]">
              {displayedTrash.map(order => {
                const customer = getCustomer(order)
                const product = getProduct(order)
                const daysLeft = daysUntilExpiry(order.deleted_at)
                const ini = customer?.name ? initials(customer.name) : '?'

                return (
                  <div key={order.id} className="flex items-start gap-4 px-5 py-4 hover:bg-red-50/30 transition-colors opacity-80">
                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-semibold text-sm shrink-0 mt-0.5">
                      {ini}
                    </div>
                    <div className="w-36 shrink-0">
                      <p className="font-semibold text-[#1C1917] text-sm">{customer?.name ?? '—'}</p>
                      <p className="text-xs text-[#78716C]">{customer?.phone}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1C1917]">{product?.name ?? '—'}</p>
                      {order.variant && <p className="text-xs text-[#78716C]">{order.variant}</p>}
                      <div className="mt-1.5">
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-[#1C1917]">{order.cod_amount} DT</p>
                      <p className="text-xs text-[#78716C]">
                        {new Date(order.deleted_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })}
                      </p>
                      {daysLeft <= 7 && (
                        <p className="text-xs text-red-500 font-medium">Expire dans {daysLeft}j</p>
                      )}
                      <div className="flex gap-2 justify-end mt-2">
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
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}

      {/* Modal — corbeille */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-[#1C1917] mb-1">Supprimer cette commande ?</h3>
            <p className="text-sm text-[#78716C] mb-3">
              {confirmDelete.status === 'delivered'
                ? 'Cette commande livrée sera déplacée dans la corbeille. Les statistiques seront mises à jour.'
                : 'La commande sera déplacée dans la corbeille. Restaurable pendant 30 jours.'}
            </p>
            <div className="bg-[#FAFAF9] rounded-lg px-4 py-3 mb-5 space-y-0.5 text-sm">
              <p className="font-medium text-[#1C1917]">{getCustomer(confirmDelete)?.name ?? '—'}</p>
              <p className="text-[#78716C]">{getProduct(confirmDelete)?.name ?? '—'}</p>
              <p className="font-semibold text-[#1C1917]">{confirmDelete.cod_amount} DT</p>
            </div>
            {actionError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{actionError}</p>
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

      {/* Modal — suppression définitive */}
      {confirmPermDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-red-700 mb-1">Suppression définitive</h3>
            <p className="text-sm text-[#78716C] mb-3">
              Cette action est irréversible. La commande sera définitivement perdue.
            </p>
            <div className="bg-[#FAFAF9] rounded-lg px-4 py-3 mb-4 space-y-0.5 text-sm">
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
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{actionError}</p>
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
