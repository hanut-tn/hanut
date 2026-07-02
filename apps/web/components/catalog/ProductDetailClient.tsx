'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Pencil, Trash2, Package, TrendingUp,
  ShoppingCart, RotateCcw, Settings, AlertTriangle, ImageOff, ShoppingBag, X,
  Calendar, RefreshCw, Check,
} from 'lucide-react'
import type { Product, ProductVariant } from '@hanut/types'
import type { ProductInput, StockAdjustmentInput } from '@/app/(dashboard)/catalog/actions'
import type { RestockOrderInput, CostUpdateMode } from '@/app/(dashboard)/catalog/restock-actions'
import ProductModal from './ProductModal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getVariantLabel } from '@/lib/variants'

type RecentOrder = {
  id: string
  cod_amount: number
  status: string
  created_at: string
  quantity: number
  customer_name: string | null
}

type StockMovement = {
  id: string
  delta: number
  quantity_before: number | null
  quantity_after: number | null
  movement_type: 'order' | 'order_cancel' | 'restock' | 'correction' | 'return' | 'loss'
  unit_cost: number | null
  supplier: string | null
  notes: string | null
  created_by_name: string
  created_at: string
  variant_name: string | null
}

type ProductStats = {
  totalOrders: number
  totalRevenue: number
  totalQtySold: number
  thisMonthQty: number
  returnRate: number
}

type AdjustType = 'restock' | 'correction' | 'return' | 'loss'

type PlannedRestock = {
  id: string
  total_quantity: number
  unit_cost: number | null
  supplier: string | null
  expected_date: string | null
  created_at: string
  variants_quantities: { variant: string; quantity: number }[]
}

type Props = {
  product: Product
  role: string
  plan?: string
  stats: ProductStats
  recentOrders: RecentOrder[]
  stockMovements: StockMovement[]
  plannedRestocks: PlannedRestock[]
  hasBlockingOrders: boolean
  upsertProduct: (input: ProductInput) => Promise<{ error?: string }>
  deleteProduct: (id: string) => Promise<{ error?: string }>
  adjustStock: (id: string, input: StockAdjustmentInput) => Promise<{ error?: string }>
  createRestockOrder: (productId: string, input: RestockOrderInput) => Promise<{ error?: string; id?: string }>
  receiveRestockOrder: (restockId: string, mode: CostUpdateMode) => Promise<{ error?: string }>
  cancelRestockOrder: (restockId: string) => Promise<{ error?: string }>
  syncProductStock: (productId: string) => Promise<{ error?: string; newStock?: number }>
}

const MOVEMENT_ICONS: Record<StockMovement['movement_type'], React.ElementType> = {
  restock:       Package,
  correction:    Settings,
  return:        RotateCcw,
  loss:          AlertTriangle,
  order:         ShoppingBag,
  order_cancel:  RotateCcw,
}
const MOVEMENT_LABELS: Record<StockMovement['movement_type'], string> = {
  restock:       'Réapprovisionnement',
  correction:    "Correction d'inventaire",
  return:        'Retour fournisseur',
  loss:          'Perte / Casse',
  order:         'Commande',
  order_cancel:  'Annulation commande',
}

export default function ProductDetailClient({
  product,
  role,
  plan,
  stats,
  recentOrders,
  stockMovements,
  plannedRestocks,
  hasBlockingOrders,
  upsertProduct,
  deleteProduct,
  adjustStock,
  createRestockOrder,
  receiveRestockOrder,
  cancelRestockOrder,
  syncProductStock,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const canWrite = role !== 'readonly'

  // Optimistic local state
  const [currentStock, setCurrentStock] = useState(product.stock)
  const [currentCost, setCurrentCost] = useState(product.cost ?? null)
  const [currentVariants, setCurrentVariants] = useState<ProductVariant[]>(product.variants)

  // Edit / Delete modals
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Stock adjustment modal
  const [showStockModal, setShowStockModal] = useState(false)
  const [adjustType, setAdjustType] = useState<AdjustType>('restock')
  const [adjustQty, setAdjustQty] = useState(0)
  const [adjustUnitCost, setAdjustUnitCost] = useState('')
  const [adjustSupplier, setAdjustSupplier] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [variantAdjs, setVariantAdjs] = useState<Record<string, number>>({})
  const [stockError, setStockError] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Planned restock toggle
  const [isPlanned, setIsPlanned] = useState(false)
  const [plannedDate, setPlannedDate] = useState('')
  const [costUpdateMode, setCostUpdateMode] = useState<CostUpdateMode>('wac')
  // Planned restocks list (optimistic)
  const [localPlannedRestocks, setLocalPlannedRestocks] = useState<PlannedRestock[]>(plannedRestocks)

  const hasVariants = currentVariants.length > 0

  function openStockModal() {
    setAdjustType('restock')
    setAdjustQty(0)
    setAdjustUnitCost('')
    setAdjustSupplier('')
    setAdjustNotes('')
    setVariantAdjs({})
    setStockError(null)
    setIsPlanned(false)
    setPlannedDate('')
    setCostUpdateMode('wac')
    setShowStockModal(true)
  }

  // Preview computed values
  const totalVariantDelta = hasVariants
    ? Object.values(variantAdjs).reduce((s, v) => s + (v || 0), 0)
    : 0

  const effectiveQty = hasVariants ? Math.abs(totalVariantDelta) : adjustQty

  const newStockPreview = (() => {
    if (hasVariants && Object.keys(variantAdjs).length > 0) {
      return currentVariants.reduce((s, v, i) => {
        const label = getVariantLabel(v, i)
        const adj = variantAdjs[label] ?? 0
        if (adjustType === 'correction') return s + Math.max(0, adj)
        if (adjustType === 'restock') return s + v.qty + Math.max(0, adj)
        return s + Math.max(0, v.qty - Math.max(0, adj))
      }, 0)
    }
    if (adjustType === 'restock') return currentStock + adjustQty
    if (adjustType === 'correction') return adjustQty
    return currentStock - adjustQty
  })()

  const unitCostNum = parseFloat(adjustUnitCost) || 0

  const wacResult = (() => {
    if (adjustType !== 'restock' || !unitCostNum || unitCostNum <= 0) return null
    if (!currentCost || currentStock <= 0) return null
    const qty = hasVariants ? totalVariantDelta : adjustQty
    if (qty <= 0) return null
    const totalQty = currentStock + qty
    const wac = Math.round((currentStock * currentCost + qty * unitCostNum) / totalQty * 100) / 100
    return { wac, qty, totalQty }
  })()

  const newMarginPreview = (() => {
    if (adjustType !== 'restock' || !product.price) return null
    let costToUse: number | null = null
    if (wacResult && costUpdateMode === 'wac') costToUse = wacResult.wac
    else if (unitCostNum > 0 && costUpdateMode === 'new') costToUse = unitCostNum
    else if (currentCost && costUpdateMode === 'keep') costToUse = currentCost
    else if (unitCostNum > 0) costToUse = unitCostNum
    if (!costToUse) return null
    return Math.round(((product.price - costToUse) / product.price) * 100)
  })()

  const summaryDelta = newStockPreview - currentStock
  const canConfirm = (() => {
    if (isPlanned) return effectiveQty > 0
    if (adjustType === 'correction') {
      if (hasVariants) return Object.keys(variantAdjs).length > 0 && adjustNotes.trim().length > 0
      return adjustQty >= 0 && adjustNotes.trim().length > 0
    }
    if (adjustType === 'loss') return effectiveQty > 0 && effectiveQty <= currentStock && adjustNotes.trim().length > 0
    if (adjustType === 'return') return effectiveQty > 0 && effectiveQty <= currentStock
    return effectiveQty > 0
  })()

  function handleAdjustStock() {
    if (!canConfirm) return

    // Build variant adjustments list
    const variantAdjustments = hasVariants && Object.keys(variantAdjs).length > 0
      ? Object.entries(variantAdjs).map(([label, value]) => ({ label, value }))
      : undefined

    const input: StockAdjustmentInput = {
      type: adjustType,
      quantity: adjustQty,
      unitCost: adjustType === 'restock' ? unitCostNum || null : null,
      costUpdateMode: adjustType === 'restock' ? costUpdateMode : undefined,
      supplier: adjustType === 'restock' ? adjustSupplier.trim() || null : null,
      notes: adjustNotes.trim() || null,
      variantAdjustments,
    }

    // Handle planned restock separately
    if (isPlanned && adjustType === 'restock') {
      const restockInput: RestockOrderInput = {
        totalQuantity: hasVariants ? totalVariantDelta : adjustQty,
        unitCost: unitCostNum || null,
        supplier: adjustSupplier.trim() || null,
        expectedDate: plannedDate || null,
        notes: adjustNotes.trim() || null,
        variantsQuantities: variantAdjustments?.filter(item => item.value > 0)
          .map(item => ({ variant: item.label, quantity: item.value })),
      }
      setShowStockModal(false)
      startTransition(async () => {
        const result = await createRestockOrder(product.id, restockInput)
        if (result?.error) {
          setStockError(result.error)
          setShowStockModal(true)
        } else {
          if (result.id) {
            setLocalPlannedRestocks(prev => [{
              id: result.id!,
              total_quantity: restockInput.totalQuantity,
              unit_cost: restockInput.unitCost ?? null,
              supplier: restockInput.supplier ?? null,
              expected_date: restockInput.expectedDate ?? null,
              created_at: new Date().toISOString(),
              variants_quantities: restockInput.variantsQuantities ?? [],
            }, ...prev])
          }
          setToastMsg(`Réapprovisionnement planifié : +${restockInput.totalQuantity} unités`)
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
          toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 3500)
        }
      })
      return
    }

    const deltaForToast = summaryDelta
    const newStockForToast = newStockPreview
    const toastText = deltaForToast > 0
      ? `+${deltaForToast} unités → ${newStockForToast} unités`
      : `${deltaForToast} unités → ${newStockForToast} unités`

    // Optimistic update
    const prevStock = currentStock
    const prevCost = currentCost
    const prevVariants = currentVariants

    setCurrentStock(newStockPreview)
    if (adjustType === 'restock' && unitCostNum > 0) {
      if (wacResult && costUpdateMode === 'wac') setCurrentCost(wacResult.wac)
      else if (costUpdateMode === 'new') setCurrentCost(unitCostNum)
      else if (costUpdateMode === 'wac' && !wacResult) setCurrentCost(unitCostNum)
    }
    if (hasVariants && variantAdjustments) {
      const updated = currentVariants.map((v, i) => {
        const label = getVariantLabel(v, i)
        const adj = variantAdjs[label] ?? 0
        let newQty: number
        if (adjustType === 'correction') newQty = Math.max(0, adj)
        else if (adjustType === 'restock') newQty = Math.max(0, v.qty + adj)
        else newQty = Math.max(0, v.qty - adj)
        return { ...v, qty: newQty }
      })
      setCurrentVariants(updated)
    }
    setShowStockModal(false)

    startTransition(async () => {
      const result = await adjustStock(product.id, input)
      if (result?.error) {
        setCurrentStock(prevStock)
        setCurrentCost(prevCost)
        setCurrentVariants(prevVariants)
        setStockError(result.error)
        setShowStockModal(true)
      } else {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
        setToastMsg(toastText)
        toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 3500)
      }
    })
  }

  function handleDelete() {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteProduct(product.id)
      if (result?.error) {
        setDeleteError(result.error)
      } else {
        router.push('/catalog')
      }
    })
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  function formatRelative(iso: string) {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return 'Hier'
    if (days < 7) return `Il y a ${days}j`
    return d.toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })
  }

  const margin = currentCost && product.price > 0
    ? Math.round(((product.price - currentCost) / product.price) * 100)
    : null

  const maxRef = Math.max(product.low_stock_alert * 4, currentStock, 10)
  const stockPct = Math.min((currentStock / maxRef) * 100, 100)
  const barColor = stockPct > 50 ? 'bg-[#16A34A]' : stockPct > 20 ? 'bg-amber-500' : 'bg-red-500'

  const ADJUST_TYPES: { key: AdjustType; label: string; icon: React.ElementType }[] = [
    { key: 'restock',    label: 'Réapprovisionnement', icon: Package    },
    { key: 'correction', label: "Correction d'inventaire", icon: Settings  },
    { key: 'return',     label: 'Retour fournisseur',  icon: RotateCcw  },
    { key: 'loss',       label: 'Perte / Casse',       icon: AlertTriangle },
  ]

  return (
    <div className="space-y-8">
      {/* Back + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/catalog" className="flex items-center gap-1.5 text-sm text-[#78716C] hover:text-[#1C1917] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Catalogue
        </Link>
        {canWrite && (
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
            <button onClick={() => setShowEditModal(true)} className="btn-primary flex items-center justify-center gap-2 text-sm">
              <Pencil className="w-4 h-4" />
              Modifier
            </button>
            <button
              onClick={() => { setDeleteError(null); setShowDeleteModal(true) }}
              disabled={hasBlockingOrders}
              title={hasBlockingOrders ? 'Ce produit est lié à des commandes' : 'Supprimer ce produit'}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          </div>
        )}
      </div>

      <h1 className="text-xl font-bold text-[#1C1917] sm:text-2xl">{product.name}</h1>

      {/* Two-column layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left — Image */}
        <div className="w-full space-y-3 lg:w-2/5">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-[#F0FDF4] flex items-center justify-center">
            {product.image_url ? (
              <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover" placeholder="blur" blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-[#78716C]">
                <ImageOff className="w-12 h-12 opacity-30" />
                <span className="text-sm">Aucune photo</span>
              </div>
            )}
          </div>
          {canWrite && (
            <button onClick={() => setShowEditModal(true)} className="btn-secondary text-sm w-full">
              {product.image_url ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
          )}
        </div>

        {/* Right — Info */}
        <div className="w-full space-y-6 lg:w-3/5">
          {/* Pricing */}
          <div className="bg-white border border-[#E7E5E4] rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#78716C] uppercase tracking-wide">Prix</h2>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[#16A34A]">{product.price} DT</span>
              <span className="text-sm text-[#78716C]">prix de vente</span>
            </div>
            {currentCost != null && (
              <div className="flex items-center gap-4 text-sm text-[#78716C]">
                <span>Prix d&apos;achat : <strong className="text-[#1C1917]">{currentCost} DT</strong></span>
                {margin !== null && (
                  <span className="text-[#16A34A] font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                    Marge {margin}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="bg-white border border-[#E7E5E4] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-[#78716C] uppercase tracking-wide mb-2">Description</h2>
              <p className="text-sm text-[#1C1917] leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Stock */}
          <div className="bg-white border border-[#E7E5E4] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#78716C] uppercase tracking-wide">Stock</h2>
              {canWrite && (
                <button onClick={openStockModal} className="text-xs text-[#16A34A] hover:text-[#15803D] font-medium flex items-center gap-1">
                  <Settings className="w-3.5 h-3.5" />
                  Ajuster le stock
                </button>
              )}
            </div>
            <div className="text-3xl font-bold text-[#1C1917]">
              {currentStock}
              <span className="text-base font-normal text-[#78716C] ml-1">unités</span>
            </div>
            <div className="h-2 rounded-full bg-[#E7E5E4]">
              <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${stockPct}%` }} />
            </div>
            <p className="text-xs text-[#78716C]">
              Seuil d&apos;alerte : {product.low_stock_alert} unités
              {currentStock <= product.low_stock_alert && currentStock > 0 && (
                <span className="ml-2 text-amber-600 font-medium inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Stock bas
                </span>
              )}
            </p>

            {/* Sync badge */}
            {hasVariants && currentVariants.reduce((s, v) => s + v.qty, 0) !== currentStock && (
              <>
                {/* Redondant depuis trg_sync_stock_from_variants — conservé comme sécurité manuelle */}
                <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Stock désynchronisé avec les variantes
                  </p>
                  <button
                    onClick={() => {
                      startTransition(async () => {
                        const result = await syncProductStock(product.id)
                        if (result.newStock !== undefined) setCurrentStock(result.newStock)
                      })
                    }}
                    disabled={isPending}
                    className="text-xs text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Synchroniser
                  </button>
                </div>
              </>
            )}

            {/* Réapprovisionnements planifiés */}
            {localPlannedRestocks.length > 0 && (
              <div className="border-t border-[#E7E5E4] pt-4 space-y-2">
                <p className="text-xs font-semibold text-[#78716C] uppercase tracking-wide">Planifiés</p>
                {localPlannedRestocks.map(r => {
                  const today = new Date().toISOString().slice(0, 10)
                  const isLate = r.expected_date && r.expected_date < today
                  return (
                    <div key={r.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-[#F5F5F4] last:border-0">
                      <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-[#16A34A]">+{r.total_quantity}</span>
                        <span className="text-[#78716C] ml-1">
                          {r.expected_date
                            ? `— prévu le ${new Date(r.expected_date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}`
                            : '— date non fixée'}
                        </span>
                        {r.supplier && <span className="text-[#A8A29E] ml-1">· {r.supplier}</span>}
                        {isLate && <span className="ml-1 text-red-600 font-medium">En retard</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            startTransition(async () => {
                              const result = await receiveRestockOrder(r.id, 'wac')
                              if (!result.error) {
                                setLocalPlannedRestocks(prev => prev.filter(x => x.id !== r.id))
                                const stockBeforeReceive = currentStock
                                setCurrentStock(s => s + r.total_quantity)
                                if (r.variants_quantities.length > 0) {
                                  setCurrentVariants(prev => prev.map((variant, index) => {
                                    const qty = r.variants_quantities.find(item => item.variant === getVariantLabel(variant, index))?.quantity ?? 0
                                    return { ...variant, qty: variant.qty + Math.max(0, qty) }
                                  }))
                                }
                                if (r.unit_cost && r.unit_cost > 0) {
                                  setCurrentCost(currentCost && stockBeforeReceive > 0
                                    ? Math.round(((stockBeforeReceive * currentCost + r.total_quantity * r.unit_cost) / (stockBeforeReceive + r.total_quantity)) * 100) / 100
                                    : r.unit_cost)
                                }
                                if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
                                setToastMsg(`+${r.total_quantity} unités reçues`)
                                toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 3000)
                              }
                            })
                          }}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-2 py-0.5 rounded font-medium disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" /> Reçu
                        </button>
                        <button
                          onClick={() => {
                            startTransition(async () => {
                              const result = await cancelRestockOrder(r.id)
                              if (!result.error) setLocalPlannedRestocks(prev => prev.filter(x => x.id !== r.id))
                            })
                          }}
                          disabled={isPending}
                          aria-label="Annuler le réapprovisionnement planifié"
                          className="text-[10px] text-[#78716C] hover:text-red-600 px-1 py-0.5 rounded disabled:opacity-50"
                        >
                          <X className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Historique des mouvements de stock — Pro uniquement */}
            {plan === 'starter' ? (
              <div className="border-t border-[#E7E5E4] pt-4">
                <p className="text-xs text-[#78716C] flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0"><rect x="1" y="5" width="10" height="7" rx="1" stroke="#9CA3AF" strokeWidth="1.2"/><path d="M4 5V3.5a2 2 0 014 0V5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  Historique des mouvements disponible sur le{' '}
                  <a href="/settings?tab=abonnement" className="text-[#16A34A] font-medium hover:underline">plan Pro</a>
                </p>
              </div>
            ) : stockMovements.length > 0 && (
              <div className="border-t border-[#E7E5E4] pt-4 space-y-2">
                <p className="text-xs font-semibold text-[#78716C] uppercase tracking-wide">Historique</p>
                {stockMovements.slice(0, 5).map(m => {
                  const Icon = MOVEMENT_ICONS[m.movement_type]
                  return (
                    <div key={m.id} className="flex items-center gap-2.5 text-xs">
                      <Icon className="w-3.5 h-3.5 text-[#78716C] shrink-0" />
                      <span className={`font-semibold tabular-nums w-10 shrink-0 ${m.delta >= 0 ? 'text-[#16A34A]' : 'text-red-600'}`}>
                        {m.delta >= 0 ? '+' : ''}{m.delta}
                      </span>
                      <span className="text-[#78716C] truncate flex-1">
                        {MOVEMENT_LABELS[m.movement_type]}
                        {m.supplier && ` — ${m.supplier}`}
                        {m.notes && ` — ${m.notes}`}
                      </span>
                      <span className="text-[#A8A29E] shrink-0">{formatRelative(m.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Variants */}
          {currentVariants.length > 0 && (
            <div className="bg-white border border-[#E7E5E4] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-[#78716C] uppercase tracking-wide mb-3">Variantes</h2>
              <div className="space-y-2">
                {currentVariants.map((v, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[#E7E5E4] last:border-0">
                    <span className="text-sm text-[#1C1917]">
                      {getVariantLabel(v, i)}
                    </span>
                    <span className="text-sm font-medium text-[#1C1917]">{v.qty} unités</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowEditModal(true)} className="mt-3 text-xs text-[#16A34A] hover:text-[#15803D] font-medium">
                Modifier les variantes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: ShoppingCart, label: 'Commandes totales', value: String(stats.totalOrders) },
          { icon: TrendingUp,   label: 'CA livré',          value: `${stats.totalRevenue.toFixed(0)} DT` },
          { icon: Package,      label: 'Vendu ce mois',     value: `${stats.thisMonthQty} unités` },
          { icon: RotateCcw,    label: 'Taux de retour',    value: `${stats.returnRate}%` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white border border-[#E7E5E4] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-[#78716C]" />
              <span className="text-xs text-[#78716C]">{label}</span>
            </div>
            <p className="text-xl font-bold text-[#1C1917]">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E5E4]">
            <h2 className="font-semibold text-[#1C1917]">Commandes récentes</h2>
            <Link href="/orders" className="text-sm text-[#16A34A] hover:text-[#15803D] font-medium">Voir toutes →</Link>
          </div>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
              <tr>
                {['Client', 'Date', 'Statut', 'Qté', 'Montant'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-[#FAFAF9] transition-colors">
                  <td className="px-5 py-3 font-medium text-[#1C1917]">{order.customer_name ?? '—'}</td>
                  <td className="px-5 py-3 text-[#78716C]">{formatDate(order.created_at)}</td>
                  <td className="px-5 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-5 py-3 text-[#78716C]">{order.quantity}</td>
                  <td className="px-5 py-3 font-semibold text-[#1C1917]">{order.cod_amount} DT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL AJUSTER LE STOCK ── */}
      {showStockModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="flex min-h-[100svh] w-full flex-col bg-white shadow-xl sm:min-h-0 sm:max-w-lg sm:rounded-xl sm:border sm:border-[#E7E5E4]">

            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[#1C1917] text-lg">Ajuster le stock</h3>
                  <p className="text-sm text-[#78716C] mt-0.5">
                    Stock actuel :{' '}
                    <span className="font-bold text-[#0B5E46]">{currentStock} unité{currentStock !== 1 ? 's' : ''}</span>
                  </p>
                </div>
                <button onClick={() => setShowStockModal(false)} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] text-[#78716C]">
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Sélection du type */}
              <div>
                <p className="text-sm font-medium text-[#1C1917] mb-3">Raison de l&apos;ajustement</p>
                <div className="grid grid-cols-2 gap-2">
                  {ADJUST_TYPES.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setAdjustType(key); setVariantAdjs({}); setAdjustQty(key === 'correction' ? currentStock : 0); setIsPlanned(false) }}
                      className={`flex items-start gap-2.5 rounded-xl p-3 text-left transition-all ${
                        adjustType === key
                          ? 'border-2 border-[#16A34A] bg-[#F0FDF4]'
                          : 'border border-[#E7E5E4] hover:border-[#16A34A] hover:bg-[#F0FDF4]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${adjustType === key ? 'text-[#166534]' : 'text-[#78716C]'}`} />
                      <span className={`text-xs font-medium leading-snug ${adjustType === key ? 'text-[#166534]' : 'text-[#78716C]'}`}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Champs dynamiques */}

              {/* RÉAPPROVISIONNEMENT */}
              {adjustType === 'restock' && (
                <div className="space-y-4">
                  {/* Planned / received toggle */}
                  <div className="flex rounded-xl border border-[#E7E5E4] overflow-hidden">
                    {[{ v: false, label: 'Déjà reçu' }, { v: true, label: 'Planifié' }].map(opt => (
                      <button key={String(opt.v)} type="button" onClick={() => setIsPlanned(opt.v)}
                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${isPlanned === opt.v ? 'bg-[#0B5E46] text-white' : 'text-[#78716C] hover:bg-[#F5F5F4]'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {!hasVariants && (
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1">Quantité reçue</label>
                      <div className="flex items-center gap-2">
                        <span className="text-[#16A34A] font-bold text-lg">+</span>
                        <input
                          className="input flex-1"
                          type="number"
                          min="0"
                          value={adjustQty || ''}
                          onChange={e => setAdjustQty(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="0"
                        />
                      </div>
                      {adjustQty > 0 && (
                        <p className="text-xs text-[#78716C] mt-1">
                          Stock après : {currentStock} + {adjustQty} = <strong className="text-[#0B5E46]">{newStockPreview} unités</strong>
                        </p>
                      )}
                    </div>
                  )}

                  {hasVariants && (
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-2">Quantité reçue par variante</label>
                      <div className="border border-[#E7E5E4] rounded-xl overflow-hidden">
                        <div className="grid grid-cols-3 bg-[#FAFAF9] px-3 py-2 text-xs font-medium text-[#78716C] uppercase tracking-wide">
                          <span>Variante</span><span className="text-right">Stock actuel</span><span className="text-right">À ajouter</span>
                        </div>
                        {currentVariants.map((v, i) => {
                          const label = getVariantLabel(v, i)
                          return (
                            <div key={i} className="grid grid-cols-3 items-center px-3 py-2 border-t border-[#E7E5E4] text-sm">
                              <span className="text-[#1C1917] truncate">{label}</span>
                              <span className="text-right text-[#78716C]">{v.qty}</span>
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[#16A34A] font-bold">+</span>
                                <input
                                  type="number" min="0"
                                  className="w-16 border border-[#E7E5E4] rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A]"
                                  value={variantAdjs[label] || ''}
                                  onChange={e => setVariantAdjs(prev => ({ ...prev, [label]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          )
                        })}
                        <div className="grid grid-cols-3 px-3 py-2 border-t border-[#E7E5E4] bg-[#FAFAF9] text-xs font-semibold">
                          <span className="text-[#1C1917]">Total</span>
                          <span className="text-right text-[#78716C]">{currentStock}</span>
                          <span className="text-right text-[#0B5E46]">+{totalVariantDelta} = {newStockPreview}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1">Prix d&apos;achat unitaire (DT)</label>
                      <input className="input" type="number" min="0" step="0.01" value={adjustUnitCost}
                        onChange={e => setAdjustUnitCost(e.target.value)} placeholder="Optionnel" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1">Fournisseur</label>
                      <input className="input" value={adjustSupplier} onChange={e => setAdjustSupplier(e.target.value)} placeholder="Optionnel" />
                    </div>
                  </div>

                  {/* Planned date */}
                  {isPlanned && (
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1">
                        <Calendar className="inline w-3.5 h-3.5 mr-1" />
                        Date de réception prévue
                      </label>
                      <input className="input" type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
                    </div>
                  )}

                  {isPlanned && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                      Le stock sera mis à jour à la réception. Un rappel apparaîtra dans la fiche produit.
                    </div>
                  )}

                  {/* WAC calculation */}
                  {!isPlanned && wacResult && currentCost && (
                    <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-[#166534]">Coût moyen pondéré (CMP)</p>
                      <div className="text-xs text-[#1C1917] space-y-0.5">
                        <p>Actuel : {currentStock} unités × {currentCost} DT = {(currentStock * currentCost).toFixed(2)} DT</p>
                        <p>Entrée : +{wacResult.qty} unités × {unitCostNum} DT = {(wacResult.qty * unitCostNum).toFixed(2)} DT</p>
                        <p className="font-semibold border-t border-[#BBF7D0] pt-1 mt-1">
                          CMP = <span className="text-[#0B5E46]">{wacResult.wac} DT</span>
                          {newMarginPreview !== null && <span className="ml-2 text-[#16A34A]">→ marge {newMarginPreview}%</span>}
                        </p>
                      </div>
                      <div className="space-y-1 pt-1 border-t border-[#BBF7D0]">
                        <p className="text-xs font-medium text-[#1C1917]">Mettre à jour le prix d&apos;achat ?</p>
                        {([
                          { v: 'wac' as CostUpdateMode, label: `Oui, CMP (${wacResult.wac} DT)` },
                          { v: 'new' as CostUpdateMode, label: `Oui, nouveau prix (${unitCostNum} DT)` },
                          { v: 'keep' as CostUpdateMode, label: `Non, garder (${currentCost} DT)` },
                        ] as { v: CostUpdateMode; label: string }[]).map(opt => (
                          <label key={opt.v} className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="radio" name="costUpdateMode" value={opt.v} checked={costUpdateMode === opt.v} onChange={() => setCostUpdateMode(opt.v)} className="accent-[#16A34A]" />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Simple margin if no WAC */}
                  {!isPlanned && !wacResult && newMarginPreview !== null && (
                    <p className="text-xs text-[#16A34A]">Marge : <strong>{newMarginPreview}%</strong></p>
                  )}
                </div>
              )}

              {/* CORRECTION D'INVENTAIRE */}
              {adjustType === 'correction' && (
                <div className="space-y-4">
                  {!hasVariants && (
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1">Quantité réelle en stock</label>
                      <input
                        className="input"
                        type="number" min="0"
                        value={adjustQty}
                        onChange={e => setAdjustQty(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder={String(currentStock)}
                      />
                      <p className={`text-xs mt-1 font-medium ${summaryDelta > 0 ? 'text-green-600' : summaryDelta < 0 ? 'text-red-600' : 'text-[#78716C]'}`}>
                        {summaryDelta === 0 ? 'Aucun changement' : `${summaryDelta > 0 ? '+' : ''}${summaryDelta} unités`}
                      </p>
                    </div>
                  )}

                  {hasVariants && (
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-2">Quantité réelle par variante</label>
                      <div className="border border-[#E7E5E4] rounded-xl overflow-hidden">
                        <div className="grid grid-cols-3 bg-[#FAFAF9] px-3 py-2 text-xs font-medium text-[#78716C] uppercase tracking-wide">
                          <span>Variante</span><span className="text-right">En stock</span><span className="text-right">Qté réelle</span>
                        </div>
                        {currentVariants.map((v, i) => {
                          const label = getVariantLabel(v, i)
                          return (
                            <div key={i} className="grid grid-cols-3 items-center px-3 py-2 border-t border-[#E7E5E4] text-sm">
                              <span className="text-[#1C1917] truncate">{label}</span>
                              <span className="text-right text-[#78716C]">{v.qty}</span>
                              <input
                                type="number" min="0"
                                className="w-20 ml-auto border border-[#E7E5E4] rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A]"
                                defaultValue={v.qty}
                                onChange={e => setVariantAdjs(prev => ({ ...prev, [label]: Math.max(0, parseInt(e.target.value) || 0) }))}
                              />
                            </div>
                          )
                        })}
                        <div className="grid grid-cols-3 px-3 py-2 border-t border-[#E7E5E4] bg-[#FAFAF9] text-xs font-semibold">
                          <span className="text-[#1C1917]">Total</span>
                          <span className="text-right text-[#78716C]">{currentStock}</span>
                          <span className={`text-right ${newStockPreview !== currentStock ? (newStockPreview > currentStock ? 'text-green-600' : 'text-red-600') : 'text-[#78716C]'}`}>{newStockPreview}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1">Raison de la correction *</label>
                    <textarea
                      className="input resize-none"
                      rows={2}
                      value={adjustNotes}
                      onChange={e => setAdjustNotes(e.target.value)}
                      placeholder="Ex: Inventaire physique du 05 juin, erreur de comptage…"
                    />
                  </div>
                </div>
              )}

              {/* RETOUR FOURNISSEUR */}
              {adjustType === 'return' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1">Quantité retournée</label>
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 font-bold text-lg">−</span>
                      <input className="input flex-1" type="number" min="0" max={currentStock}
                        value={adjustQty || ''} onChange={e => setAdjustQty(Math.max(0, parseInt(e.target.value) || 0))} placeholder="0" />
                    </div>
                    {adjustQty > 0 && (
                      <p className="text-xs text-[#78716C] mt-1">
                        Stock après : {currentStock} − {adjustQty} ={' '}
                        <strong className={newStockPreview < 0 ? 'text-red-600' : 'text-[#0B5E46]'}>{newStockPreview} unités</strong>
                      </p>
                    )}
                    {adjustQty > currentStock && (
                      <p className="text-xs text-red-600 mt-1">Dépasse le stock disponible ({currentStock} unités)</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1">Raison (optionnel)</label>
                    <input className="input" value={adjustNotes} onChange={e => setAdjustNotes(e.target.value)} placeholder="Ex: Produit défectueux" />
                  </div>
                </div>
              )}

              {/* PERTE / CASSE */}
              {adjustType === 'loss' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1">Quantité perdue ou cassée</label>
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 font-bold text-lg">−</span>
                      <input className="input flex-1" type="number" min="0" max={currentStock}
                        value={adjustQty || ''} onChange={e => setAdjustQty(Math.max(0, parseInt(e.target.value) || 0))} placeholder="0" />
                    </div>
                    {adjustQty > 0 && (
                      <p className="text-xs text-[#78716C] mt-1">
                        Stock après : {currentStock} − {adjustQty} ={' '}
                        <strong className={newStockPreview < 0 ? 'text-red-600' : 'text-[#0B5E46]'}>{newStockPreview} unités</strong>
                      </p>
                    )}
                    {adjustQty > currentStock && (
                      <p className="text-xs text-red-600 mt-1">Dépasse le stock disponible ({currentStock} unités)</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1">Raison *</label>
                    <input className="input" value={adjustNotes} onChange={e => setAdjustNotes(e.target.value)} placeholder="Ex: Casse lors du transport, vol…" required />
                  </div>
                </div>
              )}

              {/* Résumé */}
              {summaryDelta !== 0 && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${summaryDelta > 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {summaryDelta > 0 ? `Ajout de +${summaryDelta} unité${summaryDelta !== 1 ? 's' : ''}` : `Retrait de ${summaryDelta} unité${summaryDelta !== -1 ? 's' : ''}`}
                  {' '}→ {newStockPreview} unités au total
                </div>
              )}

              {stockError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{stockError}</div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#E7E5E4] bg-white px-4 py-4 sm:flex-row sm:px-6">
              <button onClick={() => setShowStockModal(false)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={handleAdjustStock}
                disabled={isPending || !canConfirm}
                className="btn-primary flex-1 disabled:opacity-40"
              >
                {isPending ? 'Enregistrement...' : isPlanned ? 'Planifier' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SUPPRESSION ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="flex min-h-[100svh] w-full flex-col bg-white shadow-xl sm:min-h-0 sm:max-w-sm sm:rounded-xl sm:border sm:border-[#E7E5E4]">
            <div className="sticky top-0 border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6">
              <h3 className="font-semibold text-[#1C1917]">Supprimer ce produit ?</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <p className="text-sm text-[#78716C]">&quot;{product.name}&quot; sera supprimé définitivement. Cette action est irréversible.</p>
              {deleteError && (
                <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{deleteError}</div>
              )}
            </div>
            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#E7E5E4] bg-white px-4 py-4 sm:flex-row sm:px-6">
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={handleDelete} disabled={isPending} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-150 ease-out hover:bg-red-700 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-red-600/40 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:ring-0 disabled:active:scale-100">
                {isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITION ── */}
      {showEditModal && (
        <ProductModal
          product={product}
          onClose={() => setShowEditModal(false)}
          onSave={async input => {
            const result = await upsertProduct(input)
            if (result?.error) return result
            setShowEditModal(false)
            router.refresh()
            return {}
          }}
        />
      )}

      {/* ── TOAST ── */}
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-2 bg-[#1C1917] text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg">
          <Check className="w-4 h-4 text-[#4ADE80] shrink-0" />
          Stock mis à jour : {toastMsg}
        </div>
      )}
    </div>
  )
}
