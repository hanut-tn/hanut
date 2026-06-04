'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import Link from 'next/link'
import {
  Search, SearchX, Download, Trash2, ChevronRight, ShoppingBag, Filter,
  X, Loader2, RotateCcw, ChevronDown,
} from 'lucide-react'
import type { OrderStatus } from '@hanut/types'
import type { UserRole } from '@/lib/get-context'
import { DELETABLE_STATUSES, ORDER_STATUS_LABELS } from '@/lib/constants'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { relativeDate, initials } from '@/lib/utils'

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
  customer: OrderCustomer | OrderCustomer[] | null
  product: OrderProduct | OrderProduct[] | null
}

type OrderCustomer = { id: string; name: string; phone: string; city?: string }
type OrderProduct = { id: string; name: string; price: number }

type TrashOrder = {
  id: string
  cod_amount: number
  status: OrderStatus
  variant?: string
  quantity: number
  deleted_at: string
  customer: OrderCustomer | OrderCustomer[] | null
  product: OrderProduct | OrderProduct[] | null
}

type Props = {
  role: UserRole
  plan: 'starter' | 'pro' | 'business'
  orders: Order[]
  initialTotal: number
  tabCounts: Record<string, number>
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
  initialTotal,
  tabCounts,
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

  // Pagination
  const [allOrders, setAllOrders] = useState<Order[]>(orders)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialTotal > orders.length)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [statusOrders, setStatusOrders] = useState<Partial<Record<OrderStatus, Order[]>>>({})
  const [statusPages, setStatusPages] = useState<Partial<Record<OrderStatus, number>>>({})
  const [statusHasMore, setStatusHasMore] = useState<Partial<Record<OrderStatus, boolean>>>({})
  const [loadingStatus, setLoadingStatus] = useState<OrderStatus | null>(null)

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
  const activeStatus: OrderStatus | null = tab !== 'all' && tab !== 'trash' ? tab : null

  // Compteurs depuis le serveur (exacts même avec pagination)
  const counts = useMemo(() => tabCounts as Partial<Record<OrderStatus | 'all', number>>, [tabCounts])

  useEffect(() => {
    if (!activeStatus || searchResults !== null || statusOrders[activeStatus]) return

    const controller = new AbortController()
    setLoadingStatus(activeStatus)
    fetch(`/api/orders/list?page=1&limit=20&status=${activeStatus}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setStatusOrders(prev => ({ ...prev, [activeStatus]: data.orders ?? [] }))
        setStatusHasMore(prev => ({ ...prev, [activeStatus]: data.hasMore ?? false }))
        setStatusPages(prev => ({ ...prev, [activeStatus]: 1 }))
      })
      .catch(() => {})
      .finally(() => setLoadingStatus(current => current === activeStatus ? null : current))

    return () => controller.abort()
  }, [activeStatus, searchResults, statusOrders])

  const filteredOrders = useMemo(() => {
    if (searchResults !== null) {
      if (!activeStatus) return searchResults
      return searchResults.filter(o => o.status === activeStatus)
    }
    if (activeStatus) return statusOrders[activeStatus] ?? []
    return allOrders
  }, [activeStatus, allOrders, searchResults, statusOrders])

  async function loadMore() {
    if (isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const statusParam = activeStatus ?? 'all'
      const nextPage = activeStatus ? (statusPages[activeStatus] ?? 1) + 1 : currentPage + 1
      const res = await fetch(`/api/orders/list?page=${nextPage}&limit=20&status=${statusParam}`)
      const data = await res.json()
      if (!res.ok) return
      if (activeStatus) {
        setStatusOrders(prev => {
          const current = prev[activeStatus] ?? []
          const existingIds = new Set(current.map(o => o.id))
          const fresh = (data.orders ?? []).filter((o: Order) => !existingIds.has(o.id))
          return { ...prev, [activeStatus]: [...current, ...fresh] }
        })
        setStatusHasMore(prev => ({ ...prev, [activeStatus]: data.hasMore ?? false }))
        setStatusPages(prev => ({ ...prev, [activeStatus]: nextPage }))
      } else {
        setAllOrders(prev => {
          const existingIds = new Set(prev.map(o => o.id))
          const fresh = (data.orders ?? []).filter((o: Order) => !existingIds.has(o.id))
          return [...prev, ...fresh]
        })
        setHasMore(data.hasMore ?? false)
        setCurrentPage(p => p + 1)
      }
    } finally {
      setIsLoadingMore(false)
    }
  }

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
  const totalForCurrentTab = activeStatus ? (counts[activeStatus] ?? 0) : initialTotal
  const totalLoaded = activeStatus ? (statusOrders[activeStatus]?.length ?? 0) : allOrders.length
  const totalRemaining = Math.max(0, totalForCurrentTab - totalLoaded)
  const currentHasMore = activeStatus
    ? (statusHasMore[activeStatus] ?? totalLoaded < totalForCurrentTab)
    : hasMore
  const isLoadingCurrentStatus = activeStatus ? loadingStatus === activeStatus : false

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#1C1917]">Commandes</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            {initialTotal} commande{initialTotal !== 1 ? 's' : ''} au total
            {pendingCount > 0 && (
              <span className="ml-2 text-amber-600 font-semibold">
                · {pendingCount} en attente
              </span>
            )}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
          {/* Search */}
          <div className="relative col-span-2 sm:col-span-1">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C] animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
            )}
            <input
              className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-[#E7E5E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] transition-all placeholder:text-[#A8A29E] sm:w-52"
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
              className={`flex w-full items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
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

          <Link href="/orders/new" className="btn-primary text-center text-sm whitespace-nowrap">
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
          isLoadingCurrentStatus ? (
            <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-8 text-center sm:p-16">
              <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-[#16A34A] border-t-transparent" />
              <p className="mt-3 text-sm text-[#78716C]">Chargement des commandes...</p>
            </div>
          ) : debouncedSearch ? (
            /* État vide — recherche sans résultats */
            <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-8 text-center sm:p-16">
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
            <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-8 text-center sm:p-16">
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
            <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-8 text-center sm:p-16">
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
          <div className="lg:bg-white lg:border lg:border-[#E7E5E4] lg:rounded-xl lg:shadow-sm lg:overflow-hidden">
            {/* En-têtes colonnes */}
            <div className="hidden grid-cols-[40px_1fr_1fr_120px_100px_140px] gap-4 items-center px-5 py-3 bg-[#FAFAF9] border-b border-[#E7E5E4] lg:grid">
              <div />
              <p className="text-xs font-medium text-[#78716C] uppercase tracking-wider">Client</p>
              <p className="text-xs font-medium text-[#78716C] uppercase tracking-wider">Produit</p>
              <p className="text-xs font-medium text-[#78716C] uppercase tracking-wider">Statut</p>
              <p className="text-xs font-medium text-[#78716C] uppercase tracking-wider text-right">Montant</p>
              <p className="text-xs font-medium text-[#78716C] uppercase tracking-wider text-right">Actions</p>
            </div>

            {/* Lignes */}
            <div className="py-1">
              {filteredOrders.map(order => {
                const customer = getCustomer(order)
                const product = getProduct(order)
                const isPendingOrder = order.status === 'pending'
                const isNew = order.status === 'new'
                const isConfirmed = order.status === 'confirmed'
                const isShipped = order.status === 'shipped'
                const canDelete = isAdmin && DELETABLE_STATUSES.includes(order.status)
                const ini = customer?.name ? initials(customer.name) : '?'

                // Boutons d'action — partagés entre mobile et desktop
                const actionButtons = (
                  <div className="flex flex-nowrap items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {(isPendingOrder || isNew) && (
                      <button
                        onClick={() => isPendingOrder ? handleConfirm(order.id) : handleStatus(order.id, 'confirmed')}
                        disabled={isPending}
                        className="text-xs font-medium border border-[#16A34A] text-[#16A34A] hover:bg-[#F0FDF4] disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Confirmer
                      </button>
                    )}
                    {isPendingOrder && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={isPending}
                        className="text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 disabled:opacity-50 px-2 py-1.5 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isConfirmed && (
                      <button
                        onClick={() => handleStatus(order.id, 'shipped')}
                        disabled={isPending}
                        className="text-xs font-medium border border-orange-400 text-orange-600 hover:bg-orange-50 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Expédier
                      </button>
                    )}
                    {isShipped && (
                      <button
                        onClick={() => handleStatus(order.id, 'delivered')}
                        disabled={isPending}
                        className="text-xs font-medium border border-[#0B5E46] text-[#0B5E46] hover:bg-[#F0FDF4] disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Livré
                      </button>
                    )}
                    {canDelete && !isPendingOrder && (
                      <button
                        onClick={() => { setConfirmDelete(order); setActionError(null) }}
                        className="text-xs font-medium text-[#A8A29E] hover:text-red-500 px-1.5 py-1.5 rounded-lg transition-colors min-h-[44px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-[#78716C] hover:text-[#1C1917] hover:bg-[#F0F0EF] transition-colors shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )

                const mobileLeadingAction = isPendingOrder ? (
                  <button
                    onClick={e => { e.stopPropagation(); handleCancel(order.id) }}
                    disabled={isPending}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E7E5E4] rounded-lg text-red-600 disabled:opacity-50"
                    aria-label="Annuler la commande"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : canDelete ? (
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDelete(order); setActionError(null) }}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E7E5E4] rounded-lg text-[#78716C]"
                    aria-label="Supprimer la commande"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : null

                const mobilePrimaryAction = isPendingOrder || isNew ? (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      if (isPendingOrder) handleConfirm(order.id)
                      else handleStatus(order.id, 'confirmed')
                    }}
                    disabled={isPending}
                    className="flex-1 min-h-[44px] rounded-lg bg-[#16A34A] text-white text-sm font-medium flex items-center justify-center disabled:opacity-50"
                  >
                    Confirmer
                  </button>
                ) : isConfirmed ? (
                  <button
                    onClick={e => { e.stopPropagation(); handleStatus(order.id, 'shipped') }}
                    disabled={isPending}
                    className="flex-1 min-h-[44px] rounded-lg bg-orange-500 text-white text-sm font-medium flex items-center justify-center disabled:opacity-50"
                  >
                    Expédier
                  </button>
                ) : isShipped ? (
                  <button
                    onClick={e => { e.stopPropagation(); handleStatus(order.id, 'delivered') }}
                    disabled={isPending}
                    className="flex-1 min-h-[44px] rounded-lg bg-[#0B5E46] text-white text-sm font-medium flex items-center justify-center disabled:opacity-50"
                  >
                    Livré
                  </button>
                ) : (
                  <div className="flex-1 min-h-[44px] rounded-lg bg-[#F5F5F4] text-[#78716C] text-sm font-medium flex items-center justify-center">
                    Aucune action
                  </div>
                )

                return (
                  <div
                    key={order.id}
                    className={`transition-colors ${isPendingOrder ? 'bg-amber-50/20' : ''}`}
                  >
                    {/* ── Layout mobile (< lg) ── */}
                    <div
                      className={`lg:hidden mb-3 bg-white border border-[#E7E5E4] rounded-xl p-4 cursor-pointer ${isPendingOrder ? 'hover:bg-amber-50/50' : 'hover:bg-[#FAFAF9]'}`}
                      onClick={() => window.location.href = `/orders/${order.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#F0FDF4] text-[#166534] flex items-center justify-center font-semibold text-sm shrink-0 select-none mt-0.5">
                          {ini}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {isPendingOrder && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold mb-0.5">
                                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                                  Via lien public
                                </span>
                              )}
                              <p className="text-sm font-semibold text-[#1C1917] truncate">
                                {customer?.name ? <Highlight text={customer.name} query={debouncedSearch} /> : '—'}
                              </p>
                              <p className="text-xs text-[#78716C] truncate">
                                {customer?.phone ? <Highlight text={customer.phone} query={debouncedSearch} /> : ''}
                                {customer?.city ? ` · ${customer.city}` : ''}
                              </p>
                              <p className="text-xs text-[#78716C] mt-0.5 truncate">
                                {product?.name ?? '—'}
                                {order.variant ? ` · ${order.variant}` : ''}
                                {order.quantity > 1 ? ` × ${order.quantity}` : ''}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <p className="text-base font-bold text-[#16A34A]">{order.cod_amount} DT</p>
                              <StatusBadge status={order.status} pulseDot={isPendingOrder} />
                              <p className="text-[10px] text-[#78716C]">{relativeDate(order.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-[#E7E5E4] mt-3 pt-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {mobileLeadingAction}
                        {mobilePrimaryAction}
                        <Link
                          href={`/orders/${order.id}`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E7E5E4] rounded-lg text-[#78716C]"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                    {/* ── Layout desktop (≥ lg) ── */}
                    <div
                      className={`hidden lg:grid grid-cols-[40px_1fr_1fr_120px_100px_140px] gap-4 items-center px-5 py-4 cursor-pointer ${isPendingOrder ? 'hover:bg-amber-50/50' : 'hover:bg-[#FAFAF9]'}`}
                      onClick={() => window.location.href = `/orders/${order.id}`}
                    >
                      <div className="w-9 h-9 rounded-full bg-[#F0FDF4] text-[#166534] flex items-center justify-center font-semibold text-sm shrink-0 select-none">
                        {ini}
                      </div>
                      <div className="min-w-0">
                        {isPendingOrder && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold mb-0.5">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                            Via lien public
                          </span>
                        )}
                        <p className="text-sm font-semibold text-[#1C1917] truncate">
                          {customer?.name ? <Highlight text={customer.name} query={debouncedSearch} /> : '—'}
                        </p>
                        <p className="text-xs text-[#78716C] truncate">
                          {customer?.phone ? <Highlight text={customer.phone} query={debouncedSearch} /> : ''}
                          {customer?.city ? ` · ${customer.city}` : ''}
                        </p>
                        <p className="text-xs text-[#A8A29E]">{relativeDate(order.created_at)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1C1917] truncate">{product?.name ?? '—'}</p>
                        <p className="text-xs text-[#78716C] truncate">
                          {[order.variant, order.quantity > 1 ? `× ${order.quantity}` : ''].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div>
                        <StatusBadge status={order.status} pulseDot={isPendingOrder} />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#16A34A]">{order.cod_amount} DT</p>
                        <p className="text-xs text-[#78716C]">COD</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        {actionButtons}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}

      {/* Charger plus */}
      {tab !== 'trash' && searchResults === null && currentHasMore && (
        <button
          onClick={loadMore}
          disabled={isLoadingMore}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E7E5E4] px-4 py-2.5 text-sm text-[#78716C] transition-colors hover:bg-[#F5F5F4] disabled:opacity-50"
        >
          {isLoadingMore ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#78716C] border-t-transparent" />
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Charger plus
              {totalRemaining > 0 && (
                <span className="text-[#A8A29E]">({totalRemaining} restante{totalRemaining !== 1 ? 's' : ''})</span>
              )}
            </>
          )}
        </button>
      )}

      {tab !== 'trash' && searchResults === null && totalLoaded > 0 && (
        <p className="text-center text-xs text-[#A8A29E]">
          {totalLoaded} affichée{totalLoaded !== 1 ? 's' : ''} sur {totalForCurrentTab}
        </p>
      )}

      {/* Vue Corbeille */}
      {tab === 'trash' && (
        displayedTrash.length === 0 ? (
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-8 text-center sm:p-16">
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
            <div className="lg:divide-y lg:divide-[#E7E5E4]">
              {displayedTrash.map(order => {
                const customer = getCustomer(order)
                const product = getProduct(order)
                const daysLeft = daysUntilExpiry(order.deleted_at)
                const ini = customer?.name ? initials(customer.name) : '?'

                return (
                  <div key={order.id} className="m-3 bg-red-50/30 border border-[#E7E5E4] border-l-2 border-l-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-semibold text-sm shrink-0">
                        {ini}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1C1917] truncate">
                              {customer?.name ?? '—'}
                            </p>
                            <p className="text-xs text-[#78716C] truncate">
                              {customer?.phone}
                              {customer?.city ? ` · ${customer.city}` : ''}
                            </p>
                            <p className="mt-0.5 text-xs text-[#78716C] truncate">
                              {product?.name ?? '—'}
                              {order.variant ? ` · ${order.variant}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <p className="text-base font-bold text-[#1C1917]">{order.cod_amount} DT</p>
                            <StatusBadge status={order.status} />
                            <p className="text-[10px] text-[#78716C]">
                              {new Date(order.deleted_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {daysLeft <= 7 && (
                      <p className="mt-2 text-xs text-red-500 font-medium">Expire dans {daysLeft}j</p>
                    )}

                    <div className="border-t border-[#E7E5E4] mt-3 pt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleRestore(order.id)}
                        disabled={isPending}
                        className="flex-1 min-h-[44px] border border-[#16A34A] text-[#16A34A] rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restaurer
                      </button>
                      <button
                        onClick={() => { setConfirmPermDelete(order); setPermDeleteInput(''); setActionError(null) }}
                        className="flex-1 min-h-[44px] border border-red-300 text-red-600 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer déf.
                      </button>
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
            <div className="flex flex-col gap-3 sm:flex-row">
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
            <div className="flex flex-col gap-3 sm:flex-row">
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
