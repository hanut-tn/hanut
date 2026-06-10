'use client'

import { useState, useMemo, useTransition, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Search, SearchX, Download, Trash2, ChevronRight, ShoppingBag, Filter,
  X, Loader2, RotateCcw, ChevronDown, Calendar,
} from 'lucide-react'
import type { OrderStatus, CarrierName } from '@hanut/types'
import type { UserRole } from '@/lib/get-context'
import { DELETABLE_STATUSES, ORDER_STATUS_LABELS, CARRIER_NAMES, CARRIER_CONFIG, PLAN_LIMITS, getUpgradeWhatsAppUrl } from '@/lib/constants'
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
  { label: 'Annulées',   value: 'cancelled' },
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
  notes?: string
  created_at: string
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
  createDeliveryFromOrder: (orderId: string, carrier: string, tracking: string | undefined, fee: number) => Promise<{ error?: string }>
  monthlyOrderCount?: number
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

function orderActionErrorMessage(error: string) {
  if (error === 'CANNOT_DELETE') {
    return 'Les commandes livrées ou retournées ne peuvent pas être supprimées.'
  }
  return error
}

type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | '30days' | '90days' | 'all'

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  today:    "Aujourd'hui",
  yesterday:'Hier',
  week:     'Cette semaine',
  month:    'Ce mois',
  '30days': '30 derniers jours',
  '90days': '90 derniers jours',
  all:      'Toutes les périodes',
}

function getDateRange(filter: DateFilter): { start: string; end: string } | null {
  if (filter === 'all') return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86400000)
  switch (filter) {
    case 'today':     return { start: today.toISOString(), end: tomorrow.toISOString() }
    case 'yesterday': return { start: new Date(today.getTime() - 86400000).toISOString(), end: today.toISOString() }
    case 'week': {
      const dow = today.getDay()
      const diff = dow === 0 ? 6 : dow - 1
      return { start: new Date(today.getTime() - diff * 86400000).toISOString(), end: tomorrow.toISOString() }
    }
    case 'month':   return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: tomorrow.toISOString() }
    case '30days':  return { start: new Date(today.getTime() - 29 * 86400000).toISOString(), end: tomorrow.toISOString() }
    case '90days':  return { start: new Date(today.getTime() - 89 * 86400000).toISOString(), end: tomorrow.toISOString() }
    default: return null
  }
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
  createDeliveryFromOrder,
  monthlyOrderCount = 0,
}: Props) {
  const orderLimitReached = plan === 'starter' && monthlyOrderCount >= 100
  const [tab, setTab] = useState<OrderStatus | 'all' | 'trash'>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
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
  const [dateOrders, setDateOrders] = useState<Order[]>([])
  const [datePage, setDatePage] = useState(1)
  const [dateHasMore, setDateHasMore] = useState(false)
  const [dateTotal, setDateTotal] = useState(0)
  const [isLoadingDate, setIsLoadingDate] = useState(false)

  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Modal expédition
  const [shippingModal, setShippingModal] = useState<{ orderId: string; customerName: string; codAmount: number } | null>(null)
  const [shipCarrier, setShipCarrier] = useState<CarrierName | ''>('')
  const [shipTracking, setShipTracking] = useState('')
  const [shipFee, setShipFee] = useState<number | ''>(0)
  const [shipError, setShipError] = useState<string | null>(null)

  // Toast
  const [toast, setToast] = useState<string | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string) {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast(msg)
    toastRef.current = setTimeout(() => setToast(null), 2000)
  }

  // Counts locaux — mis à jour instantanément, initialisés depuis le serveur
  const [localTabCounts, setLocalTabCounts] = useState<Record<string, number>>(tabCounts)

  // Corbeille locale — permet le retrait optimiste
  const [localTrashOrders, setLocalTrashOrders] = useState<TrashOrder[]>(trashOrders)

  function findLocalOrder(orderId: string) {
    const loadedOrder = allOrders.find(o => o.id === orderId)
    if (loadedOrder) return loadedOrder

    const searchedOrder = searchResults?.find(o => o.id === orderId)
    if (searchedOrder) return searchedOrder

    const datedOrder = dateOrders.find(o => o.id === orderId)
    if (datedOrder) return datedOrder

    for (const list of Object.values(statusOrders)) {
      const found = list?.find(o => o.id === orderId)
      if (found) return found
    }

    return null
  }

  // Applique une mise à jour de statut dans tous les stores locaux + counts
  function applyOptimisticStatus(orderId: string, newStatus: OrderStatus, oldStatus?: OrderStatus) {
    // Trouver le statut actuel si non fourni
    const resolvedOld = oldStatus ?? findLocalOrder(orderId)?.status

    const patch = (list: Order[]) => list.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
    setAllOrders(patch)
    setStatusOrders(prev => {
      const next: typeof prev = {}
      for (const k of Object.keys(prev) as OrderStatus[]) {
        next[k] = prev[k] ? patch(prev[k]!) : prev[k]
      }
      return next
    })
    setSearchResults(prev => prev ? patch(prev) : null)
    setDateOrders(patch)
    if (dateRange && activeStatus && resolvedOld === activeStatus && newStatus !== activeStatus) {
      setDateTotal(prev => Math.max(0, prev - 1))
    }

    // Mettre à jour les counts
    if (resolvedOld && resolvedOld !== newStatus) {
      setLocalTabCounts(prev => ({
        ...prev,
        [resolvedOld]: Math.max(0, (prev[resolvedOld] ?? 0) - 1),
        [newStatus]: (prev[newStatus] ?? 0) + 1,
      }))
    }
  }

  // Retire une commande de tous les stores locaux + decremente le count
  function applyOptimisticRemoveOrder(orderId: string) {
    const order = findLocalOrder(orderId)
    const wasInDateOrders = dateOrders.some(o => o.id === orderId)

    const remover = (list: Order[]) => list.filter(o => o.id !== orderId)
    setAllOrders(remover)
    setStatusOrders(prev => {
      const next: typeof prev = {}
      for (const k of Object.keys(prev) as OrderStatus[]) {
        next[k] = prev[k] ? remover(prev[k]!) : prev[k]
      }
      return next
    })
    setSearchResults(prev => prev ? remover(prev) : null)
    setDateOrders(remover)
    if (wasInDateOrders) setDateTotal(prev => Math.max(0, prev - 1))

    if (order?.status) {
      setLocalTabCounts(prev => ({
        ...prev,
        all: Math.max(0, (prev.all ?? 0) - 1),
        [order.status]: Math.max(0, (prev[order.status] ?? 0) - 1),
      }))
    }
  }

  // Debounce
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

  const counts = useMemo(() => localTabCounts as Partial<Record<OrderStatus | 'all', number>>, [localTabCounts])

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

  const dateRange = useMemo(() => getDateRange(dateFilter), [dateFilter])

  useEffect(() => {
    if (!dateRange || searchResults !== null || tab === 'trash') {
      setDateOrders([])
      setDatePage(1)
      setDateHasMore(false)
      setDateTotal(0)
      setIsLoadingDate(false)
      return
    }

    const controller = new AbortController()
    const statusParam = activeStatus ?? 'all'
    const params = new URLSearchParams({
      page: '1',
      limit: '20',
      status: statusParam,
      since: dateRange.start,
      until: dateRange.end,
    })

    setIsLoadingDate(true)
    fetch(`/api/orders/list?${params.toString()}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setDateOrders(data.orders ?? [])
        setDateHasMore(data.hasMore ?? false)
        setDateTotal(data.total ?? 0)
        setDatePage(1)
      })
      .catch(() => {})
      .finally(() => setIsLoadingDate(false))

    return () => controller.abort()
  }, [activeStatus, dateRange, searchResults, tab])

  const filteredOrders = useMemo(() => {
    let result: Order[]
    if (searchResults !== null) {
      result = activeStatus ? searchResults.filter(o => o.status === activeStatus) : searchResults
      if (dateRange) {
        result = result.filter(o => o.created_at >= dateRange.start && o.created_at < dateRange.end)
      }
      return result
    }
    if (dateRange) {
      result = activeStatus ? dateOrders.filter(o => o.status === activeStatus) : dateOrders
    } else if (activeStatus) {
      result = statusOrders[activeStatus] ?? []
    } else {
      result = allOrders
    }
    return result
  }, [activeStatus, allOrders, dateOrders, searchResults, statusOrders, dateRange])

  async function loadMore() {
    if (isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const statusParam = activeStatus ?? 'all'
      if (dateRange) {
        const nextPage = datePage + 1
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: '20',
          status: statusParam,
          since: dateRange.start,
          until: dateRange.end,
        })
        const res = await fetch(`/api/orders/list?${params.toString()}`)
        const data = await res.json()
        if (!res.ok) return
        setDateOrders(prev => {
          const existingIds = new Set(prev.map(o => o.id))
          const fresh = (data.orders ?? []).filter((o: Order) => !existingIds.has(o.id))
          return [...prev, ...fresh]
        })
        setDateHasMore(data.hasMore ?? false)
        setDateTotal(data.total ?? 0)
        setDatePage(nextPage)
        return
      }

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

  const STATUS_TOAST: Partial<Record<OrderStatus, string>> = {
    new:       '✓ Commande confirmée',
    confirmed: '✓ Commande confirmée',
    shipped:   '✓ Commande expédiée',
    delivered: '✓ Commande livrée',
    returned:  '✓ Commande retournée',
    cancelled: '✓ Commande annulée',
  }

  function handleStatus(orderId: string, status: OrderStatus) {
    const order = findLocalOrder(orderId)
    const oldStatus = order?.status
    applyOptimisticStatus(orderId, status, oldStatus)
    setUpdatingId(orderId)
    startTransition(async () => {
      try {
        await updateStatus(orderId, status)
        if (STATUS_TOAST[status]) showToast(STATUS_TOAST[status]!)
      } catch {
        if (oldStatus) applyOptimisticStatus(orderId, oldStatus, status)
        showToast('Erreur. Veuillez réessayer.')
      } finally {
        setUpdatingId(null)
      }
    })
  }

  function handleConfirm(orderId: string) {
    applyOptimisticStatus(orderId, 'new', 'pending')
    setUpdatingId(orderId)
    startTransition(async () => {
      try {
        await confirmOrder(orderId)
        showToast('✓ Commande confirmée')
      } catch {
        applyOptimisticStatus(orderId, 'pending', 'new')
        showToast('Erreur. Veuillez réessayer.')
      } finally {
        setUpdatingId(null)
      }
    })
  }

  function handleCancel(orderId: string) {
    applyOptimisticStatus(orderId, 'cancelled', 'pending')
    setUpdatingId(orderId)
    startTransition(async () => {
      try {
        await cancelPendingOrder(orderId)
        showToast('✓ Commande annulée')
      } catch {
        applyOptimisticStatus(orderId, 'pending', 'cancelled')
        showToast('Erreur. Veuillez réessayer.')
      } finally {
        setUpdatingId(null)
      }
    })
  }

  function openShipModal(order: Order) {
    const customer = getCustomer(order)
    setShipCarrier('')
    setShipTracking('')
    setShipFee(0)
    setShipError(null)
    setShippingModal({ orderId: order.id, customerName: customer?.name ?? '', codAmount: order.cod_amount })
  }

  function confirmShip(skipDetails: boolean) {
    if (!shippingModal) return
    if (!shipCarrier) { setShipError('Sélectionnez un transporteur'); return }
    const { orderId } = shippingModal
    const carrier = shipCarrier
    const tracking = skipDetails ? undefined : (shipTracking.trim() || undefined)
    const fee = skipDetails ? 0 : (shipFee === '' ? 0 : Number(shipFee))
    setShippingModal(null)
    applyOptimisticStatus(orderId, 'shipped', 'confirmed')
    setUpdatingId(orderId)
    startTransition(async () => {
      try {
        const result = await createDeliveryFromOrder(orderId, carrier, tracking, fee)
        if (result?.error) {
          applyOptimisticStatus(orderId, 'confirmed', 'shipped')
          showToast(`Erreur : ${result.error}`)
        } else {
          showToast('✓ Commande expédiée · Livraison créée')
        }
      } catch {
        applyOptimisticStatus(orderId, 'confirmed', 'shipped')
        showToast('Erreur. Veuillez réessayer.')
      } finally {
        setUpdatingId(null)
      }
    })
  }

  function handleDelete(id: string) {
    setActionError(null)
    const order = findLocalOrder(id)
    const prevAll = allOrders
    const prevStatus = statusOrders
    const prevSearchResults = searchResults
    const prevCounts = localTabCounts
    const prevTrash = localTrashOrders
    const prevDateOrders = dateOrders
    const prevDateTotal = dateTotal
    applyOptimisticRemoveOrder(id)
    if (order) {
      setLocalTrashOrders(prev => [{ ...order, deleted_at: new Date().toISOString() }, ...prev])
    }
    setConfirmDelete(null)
    startTransition(async () => {
      const result = await deleteOrder(id)
      if (result?.error) {
        setAllOrders(prevAll)
        setStatusOrders(prevStatus)
        setSearchResults(prevSearchResults)
        setLocalTabCounts(prevCounts)
        setLocalTrashOrders(prevTrash)
        setDateOrders(prevDateOrders)
        setDateTotal(prevDateTotal)
        setActionError(orderActionErrorMessage(result.error))
      } else {
        showToast('✓ Commande déplacée dans la corbeille')
      }
    })
  }

  function handleRestore(id: string) {
    setActionError(null)
    const trashedOrder = localTrashOrders.find(o => o.id === id)
    if (!trashedOrder) return

    const prevTrash = localTrashOrders
    const prevAll = allOrders
    const prevStatus = statusOrders
    const prevCounts = localTabCounts
    const prevDateOrders = dateOrders
    const prevDateTotal = dateTotal

    // Optimistic : retirer de la corbeille ET ajouter aux commandes actives
    setLocalTrashOrders(prev => prev.filter(o => o.id !== id))
    const restoredOrder: Order = {
      id: trashedOrder.id,
      cod_amount: trashedOrder.cod_amount,
      status: trashedOrder.status,
      variant: trashedOrder.variant,
      quantity: trashedOrder.quantity,
      notes: trashedOrder.notes,
      created_at: trashedOrder.created_at,
      customer: trashedOrder.customer,
      product: trashedOrder.product,
    }
    setAllOrders(prev => [restoredOrder, ...prev])
    setStatusOrders(prev => {
      const currentStatusOrders = prev[trashedOrder.status]
      if (!currentStatusOrders) return prev
      if (currentStatusOrders.some(order => order.id === id)) return prev
      return { ...prev, [trashedOrder.status]: [restoredOrder, ...currentStatusOrders] }
    })
    if (
      dateRange &&
      restoredOrder.created_at >= dateRange.start &&
      restoredOrder.created_at < dateRange.end &&
      (!activeStatus || restoredOrder.status === activeStatus)
    ) {
      setDateOrders(prev => prev.some(order => order.id === id) ? prev : [restoredOrder, ...prev])
      setDateTotal(prev => prev + 1)
    }
    setLocalTabCounts(prev => ({
      ...prev,
      all: (prev.all ?? 0) + 1,
      [trashedOrder.status]: (prev[trashedOrder.status] ?? 0) + 1,
    }))

    startTransition(async () => {
      const result = await restoreOrder(id)
      if (result?.error) {
        setLocalTrashOrders(prevTrash)
        setAllOrders(prevAll)
        setStatusOrders(prevStatus)
        setLocalTabCounts(prevCounts)
        setDateOrders(prevDateOrders)
        setDateTotal(prevDateTotal)
        setActionError(result.error)
      } else {
        showToast('✓ Commande restaurée')
      }
    })
  }

  function handlePermanentDelete(id: string) {
    setActionError(null)
    const prevTrash = localTrashOrders
    setLocalTrashOrders(prev => prev.filter(o => o.id !== id))
    setConfirmPermDelete(null)
    setPermDeleteInput('')
    startTransition(async () => {
      const result = await permanentlyDeleteOrder(id)
      if (result?.error) {
        setLocalTrashOrders(prevTrash)
        setActionError(result.error)
        // Pas de re-ouverture de modal — l'erreur s'affiche via actionError
      } else {
        showToast('✓ Commande supprimée définitivement')
      }
    })
  }

  const displayedTrash = tab === 'trash' ? localTrashOrders : []
  const pendingCount = counts['pending'] ?? 0
  const totalForCurrentTab = dateRange
    ? dateTotal
    : activeStatus ? (counts[activeStatus] ?? 0) : initialTotal
  const totalLoaded = dateRange
    ? dateOrders.length
    : activeStatus ? (statusOrders[activeStatus]?.length ?? 0) : allOrders.length
  const totalRemaining = Math.max(0, totalForCurrentTab - totalLoaded)
  const currentHasMore = dateRange
    ? dateHasMore
    : activeStatus
    ? (statusHasMore[activeStatus] ?? totalLoaded < totalForCurrentTab)
    : hasMore
  const isLoadingCurrentStatus = isLoadingDate || (activeStatus ? loadingStatus === activeStatus : false)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1917]">Commandes</h1>
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

          <div className="relative col-span-2 sm:col-span-1">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as DateFilter)}
              className={`w-full appearance-none pl-9 pr-8 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[#16A34A]/30 focus:border-[#16A34A] ${
                dateFilter !== 'all'
                  ? 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]'
                  : 'bg-white text-[#78716C] border-[#E7E5E4] hover:bg-[#F5F5F4]'
              }`}
            >
              {(Object.entries(DATE_FILTER_LABELS) as [DateFilter, string][]).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
          </div>

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

          {orderLimitReached ? (
            <div className="relative group">
              <button disabled className="btn-primary text-center text-sm whitespace-nowrap opacity-50 cursor-not-allowed">
                + Nouvelle commande
              </button>
              <div className="absolute bottom-full mb-1.5 right-0 whitespace-nowrap bg-[#1C1917] text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Limite de 100 commandes atteinte ce mois
              </div>
            </div>
          ) : (
            <Link href="/orders/new" className="btn-primary text-center text-sm whitespace-nowrap">
              + Nouvelle commande
            </Link>
          )}
        </div>
      </div>

      {/* Badges filtres actifs */}
      {(debouncedSearch || dateFilter !== 'all') && (
        <div className="flex items-center gap-2.5 flex-wrap">
          {dateFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] px-2.5 py-1 rounded-full">
              <Calendar className="w-3 h-3" />
              {DATE_FILTER_LABELS[dateFilter]}
              <span className="text-[#78716C] ml-0.5">· {filteredOrders.length} commande{filteredOrders.length !== 1 ? 's' : ''}</span>
              <button onClick={() => setDateFilter('all')} className="ml-0.5 hover:text-[#0B5E46] transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
      {/* Badge recherche */}
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
            onClick={() => { setTab(t.value); setDateFilter('all') }}
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
            onClick={() => { setTab('trash'); setDateFilter('all') }}
            className={`ml-auto flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
              tab === 'trash'
                ? 'text-red-600 border-b-2 border-red-400 -mb-px'
                : 'text-[#78716C] hover:text-red-500'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Corbeille
            <span className={tab === 'trash' ? 'text-red-600' : 'text-[#A8A29E]'}>
              ({localTrashOrders.length})
            </span>
          </button>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700">
          {actionError}
        </div>
      )}

      {/* Compteur mensuel — Starter uniquement */}
      {plan === 'starter' && tab !== 'trash' && (() => {
        const limit = PLAN_LIMITS.starter.ordersPerMonth
        const pct = Math.min(100, Math.round((monthlyOrderCount / limit) * 100))
        const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-[#16A34A]'
        const textColor = pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-[#78716C]'
        return (
          <div className="bg-white border border-[#E7E5E4] rounded-xl px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className={`text-sm font-medium ${textColor}`}>
                {monthlyOrderCount >= limit
                  ? 'Limite atteinte — Passe au plan Pro pour des commandes illimitées'
                  : pct >= 90
                    ? `Plus que ${limit - monthlyOrderCount} commande${limit - monthlyOrderCount > 1 ? 's' : ''} disponible${limit - monthlyOrderCount > 1 ? 's' : ''} ce mois`
                    : `${monthlyOrderCount} / ${limit} commandes ce mois`
                }
              </span>
              {monthlyOrderCount >= limit && (
                <a
                  href={getUpgradeWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-semibold text-[#16A34A] hover:underline whitespace-nowrap"
                >
                  Passer au Pro →
                </a>
              )}
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })()}

      {/* Liste commandes */}
      {tab !== 'trash' && (
        filteredOrders.length === 0 ? (
          isLoadingCurrentStatus ? (
            <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-8 text-center sm:p-16">
              <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-[#16A34A] border-t-transparent" />
              <p className="mt-3 text-sm text-[#78716C]">Chargement des commandes...</p>
            </div>
          ) : debouncedSearch ? (
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
            <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-8 text-center sm:p-16">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-[#78716C] opacity-30" />
              <p className="font-semibold text-[#1C1917] mb-1">Aucune commande pour l&apos;instant</p>
              <p className="text-sm text-[#78716C] mb-6">
                Partagez votre lien de commande ou créez votre première commande
              </p>
              {!orderLimitReached && (
                <Link href="/orders/new" className="btn-primary text-sm">
                  + Nouvelle commande
                </Link>
              )}
            </div>
          ) : (
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
          <>
            {/* ── Cards mobiles (< lg) ── */}
            <div className="space-y-3 lg:hidden">
              {filteredOrders.map(order => {
                const customer = getCustomer(order)
                const product = getProduct(order)
                const isPendingOrder = order.status === 'pending'
                const isNew = order.status === 'new'
                const isConfirmed = order.status === 'confirmed'
                const isShipped = order.status === 'shipped'
                const canDelete = isAdmin && DELETABLE_STATUSES.includes(order.status)
                const ini = customer?.name ? initials(customer.name) : '?'

                const isUpdatingThis = updatingId === order.id
                const mobileLeadingAction = isPendingOrder ? (
                  <button
                    onClick={e => { e.stopPropagation(); handleCancel(order.id) }}
                    disabled={isPending || isUpdatingThis}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#E7E5E4] rounded-lg text-red-600 disabled:opacity-50"
                    aria-label="Annuler la commande"
                  >
                    {isUpdatingThis ? <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" /> : <X className="w-4 h-4" />}
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
                    disabled={isPending || isUpdatingThis}
                    className="flex-1 min-h-[44px] rounded-lg bg-[#16A34A] text-white text-sm font-medium flex items-center justify-center disabled:opacity-50"
                  >
                    {isUpdatingThis ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirmer'}
                  </button>
                ) : isConfirmed ? (
                  <button
                    onClick={e => { e.stopPropagation(); openShipModal(order) }}
                    disabled={isPending || isUpdatingThis}
                    className="flex-1 min-h-[44px] rounded-lg bg-orange-500 text-white text-sm font-medium flex items-center justify-center disabled:opacity-50"
                  >
                    {isUpdatingThis ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Expédier'}
                  </button>
                ) : isShipped ? (
                  <button
                    onClick={e => { e.stopPropagation(); handleStatus(order.id, 'delivered') }}
                    disabled={isPending || isUpdatingThis}
                    className="flex-1 min-h-[44px] rounded-lg bg-[#0B5E46] text-white text-sm font-medium flex items-center justify-center disabled:opacity-50"
                  >
                    {isUpdatingThis ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Livré'}
                  </button>
                ) : (
                  <div className="flex-1 min-h-[44px] rounded-lg bg-[#F5F5F4] text-[#78716C] text-sm font-medium flex items-center justify-center">
                    Aucune action
                  </div>
                )

                return (
                  <div
                    key={order.id}
                    className={`bg-white border border-[#E7E5E4] rounded-xl p-4 cursor-pointer ${isPendingOrder ? 'hover:bg-amber-50/50' : 'hover:bg-[#FAFAF9]'}`}
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
                )
              })}
            </div>

            {/* ── Tableau desktop (≥ lg) ── */}
            <div className="hidden lg:block bg-white border border-[#E7E5E4] rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
                    <th className="w-10 px-5 py-3" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wider">Produit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wider w-[130px]">Statut</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#78716C] uppercase tracking-wider w-[110px]">Montant</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#78716C] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E4]">
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
                      <tr
                        key={order.id}
                        onClick={() => window.location.href = `/orders/${order.id}`}
                        className={`cursor-pointer transition-colors ${isPendingOrder ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-[#FAFAF9]'}`}
                      >
                        {/* Avatar */}
                        <td className="px-5 py-4">
                          <div className="w-8 h-8 rounded-full bg-[#F0FDF4] text-[#166534] flex items-center justify-center text-xs font-semibold select-none shrink-0">
                            {ini}
                          </div>
                        </td>

                        {/* Client */}
                        <td className="px-4 py-4 max-w-[220px]">
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
                        </td>

                        {/* Produit */}
                        <td className="px-4 py-4 max-w-[200px]">
                          <p className="text-sm font-medium text-[#1C1917] truncate">{product?.name ?? '—'}</p>
                          <p className="text-xs text-[#78716C] truncate">
                            {[order.variant, order.quantity > 1 ? `× ${order.quantity}` : ''].filter(Boolean).join(' · ')}
                          </p>
                        </td>

                        {/* Statut */}
                        <td className="px-4 py-4">
                          <StatusBadge status={order.status} pulseDot={isPendingOrder} />
                        </td>

                        {/* Montant */}
                        <td className="px-4 py-4 text-right">
                          <p className="text-sm font-bold text-[#16A34A]">{order.cod_amount} DT</p>
                          <p className="text-xs text-[#78716C]">COD</p>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {(isPendingOrder || isNew) && (
                              <button
                                onClick={() => isPendingOrder ? handleConfirm(order.id) : handleStatus(order.id, 'confirmed')}
                                disabled={isPending || updatingId === order.id}
                                className="text-xs font-medium border border-[#16A34A] text-[#16A34A] hover:bg-[#F0FDF4] disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap min-w-[72px] flex items-center justify-center gap-1.5"
                              >
                                {updatingId === order.id ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : 'Confirmer'}
                              </button>
                            )}
                            {isPendingOrder && (
                              <button
                                onClick={() => handleCancel(order.id)}
                                disabled={isPending || updatingId === order.id}
                                className="text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 disabled:opacity-50 px-2 py-1.5 rounded-lg transition-colors"
                              >
                                {updatingId === order.id ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : <X className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {isConfirmed && (
                              <button
                                onClick={() => openShipModal(order)}
                                disabled={isPending || updatingId === order.id}
                                className="text-xs font-medium border border-orange-400 text-orange-600 hover:bg-orange-50 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap min-w-[72px] flex items-center justify-center gap-1.5"
                              >
                                {updatingId === order.id ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : 'Expédier'}
                              </button>
                            )}
                            {isShipped && (
                              <button
                                onClick={() => handleStatus(order.id, 'delivered')}
                                disabled={isPending || updatingId === order.id}
                                className="text-xs font-medium border border-[#0B5E46] text-[#0B5E46] hover:bg-[#F0FDF4] disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap min-w-[52px] flex items-center justify-center gap-1.5"
                              >
                                {updatingId === order.id ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : 'Livré'}
                              </button>
                            )}
                            {canDelete && !isPendingOrder && (
                              <button
                                onClick={() => { setConfirmDelete(order); setActionError(null) }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#A8A29E] hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <Link
                              href={`/orders/${order.id}`}
                              onClick={e => e.stopPropagation()}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#78716C] hover:text-[#1C1917] hover:bg-[#F0F0EF] transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
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
                            <p className="text-sm font-semibold text-[#1C1917] truncate">{customer?.name ?? '—'}</p>
                            <p className="text-xs text-[#78716C] truncate">
                              {customer?.phone}{customer?.city ? ` · ${customer.city}` : ''}
                            </p>
                            <p className="mt-0.5 text-xs text-[#78716C] truncate">
                              {product?.name ?? '—'}{order.variant ? ` · ${order.variant}` : ''}
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

      {/* Modal — expédition */}
      {shippingModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center sm:p-4">
          <div className="w-full bg-white shadow-xl rounded-t-2xl sm:max-w-md sm:rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E5E4]">
              <div>
                <h3 className="font-semibold text-[#1C1917]">Expédier la commande</h3>
                <p className="text-xs text-[#78716C] mt-0.5">{shippingModal.customerName} — {shippingModal.codAmount} DT</p>
              </div>
              <button onClick={() => setShippingModal(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] text-[#78716C]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-2">Transporteur *</label>
                <div className="flex flex-wrap gap-2">
                  {CARRIER_NAMES.map(c => {
                    const cfg = CARRIER_CONFIG[c]
                    const sel = shipCarrier === c
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setShipCarrier(c); setShipError(null) }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[40px] ${sel ? `${cfg.bg} ${cfg.color} border-current` : 'border-[#E7E5E4] text-[#78716C] hover:border-[#D6D3D1]'}`}
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1">N° de suivi</label>
                <input
                  className="input"
                  value={shipTracking}
                  onChange={e => setShipTracking(e.target.value)}
                  placeholder="Optionnel — vous pouvez l'ajouter plus tard"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1">Frais de livraison (DT)</label>
                <input
                  className="input text-base"
                  type="number"
                  min="0"
                  step="0.5"
                  value={shipFee}
                  onChange={e => setShipFee(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              {shipError && <p className="text-sm text-red-600">{shipError}</p>}
            </div>
            <div className="flex gap-3 px-5 pb-6">
              <button
                onClick={() => confirmShip(true)}
                disabled={!shipCarrier}
                className="flex-1 border border-[#E7E5E4] text-[#78716C] rounded-lg px-4 py-2.5 text-sm min-h-[44px] disabled:opacity-40 hover:bg-[#F5F5F4] transition-colors"
              >
                Remplir plus tard
              </button>
              <button
                onClick={() => confirmShip(false)}
                disabled={!shipCarrier}
                className="flex-1 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg px-4 py-2.5 text-sm font-medium min-h-[44px] disabled:opacity-40 transition-colors"
              >
                Confirmer l&apos;expédition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0">
          <div className="rounded-full bg-[#1C1917] px-4 py-2 text-sm text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
