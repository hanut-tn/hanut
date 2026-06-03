'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Pencil, Trash2, Package, TrendingUp,
  ShoppingCart, RotateCcw, Settings, AlertTriangle, ImageOff,
} from 'lucide-react'
import type { Product } from '@hanut/types'
import type { ProductInput } from '@/app/(dashboard)/catalog/actions'
import ProductModal from './ProductModal'
import { StatusBadge } from '@/components/ui/StatusBadge'

type RecentOrder = {
  id: string
  cod_amount: number
  status: string
  created_at: string
  quantity: number
  customer_name: string | null
}

type ProductStats = {
  totalOrders: number
  totalRevenue: number
  totalQtySold: number
  thisMonthQty: number
  returnRate: number
}

type Props = {
  product: Product
  role: string
  stats: ProductStats
  recentOrders: RecentOrder[]
  hasBlockingOrders: boolean
  upsertProduct: (input: ProductInput) => Promise<{ error?: string }>
  deleteProduct: (id: string) => Promise<{ error?: string }>
  adjustStock: (id: string, newStock: number, reason: string) => Promise<{ error?: string }>
}

const ADJUST_REASONS = [
  'Réapprovisionnement',
  "Correction d'inventaire",
  'Retour fournisseur',
]

export default function ProductDetailClient({
  product,
  role,
  stats,
  recentOrders,
  hasBlockingOrders,
  upsertProduct,
  deleteProduct,
  adjustStock,
}: Props) {
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [stockValue, setStockValue] = useState(String(product.stock))
  const [stockReason, setStockReason] = useState(ADJUST_REASONS[0])
  const [stockError, setStockError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const canWrite = role !== 'readonly'

  const margin =
    product.cost && product.price > 0
      ? Math.round(((product.price - product.cost) / product.price) * 100)
      : null

  const maxRef = Math.max(product.low_stock_alert * 4, product.stock, 10)
  const stockPct = Math.min((product.stock / maxRef) * 100, 100)
  const barColor =
    stockPct > 50 ? 'bg-[#16A34A]' : stockPct > 20 ? 'bg-amber-500' : 'bg-red-500'

  function handleAdjustStock() {
    const newStock = parseInt(stockValue)
    if (isNaN(newStock) || newStock < 0) {
      setStockError('Valeur invalide')
      return
    }
    setStockError(null)
    startTransition(async () => {
      const result = await adjustStock(product.id, newStock, stockReason)
      if (result?.error) {
        setStockError(result.error)
      } else {
        setShowStockModal(false)
        router.refresh()
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
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-8">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/catalog"
          className="flex items-center gap-1.5 text-sm text-[#78716C] hover:text-[#1C1917] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Catalogue
        </Link>
        {canWrite && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Modifier
            </button>
              <button
                onClick={() => { setDeleteError(null); setShowDeleteModal(true) }}
                disabled={hasBlockingOrders}
                title={hasBlockingOrders ? 'Ce produit est lié à des commandes' : 'Supprimer ce produit'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Product name */}
      <h1 className="text-2xl font-bold text-[#1C1917]">{product.name}</h1>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left — Image (40%) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-[#F0FDF4] flex items-center justify-center">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k="
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-[#78716C]">
                <ImageOff className="w-12 h-12 opacity-30" />
                <span className="text-sm">Aucune photo</span>
              </div>
            )}
          </div>
          {canWrite && (
            <button
              onClick={() => setShowEditModal(true)}
              className="btn-secondary text-sm w-full"
            >
              {product.image_url ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
          )}
        </div>

        {/* Right — Info (60%) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Pricing */}
          <div className="bg-white border border-[#E7E5E4] rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[#78716C] uppercase tracking-wide">Prix</h2>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[#16A34A]">{product.price} DT</span>
              <span className="text-sm text-[#78716C]">prix de vente</span>
            </div>
            {product.cost != null && (
              <div className="flex items-center gap-4 text-sm text-[#78716C]">
                <span>Coût : <strong className="text-[#1C1917]">{product.cost} DT</strong></span>
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
                <button
                  onClick={() => { setStockValue(String(product.stock)); setShowStockModal(true) }}
                  className="text-xs text-[#16A34A] hover:text-[#15803D] font-medium flex items-center gap-1"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Ajuster le stock
                </button>
              )}
            </div>
            <div className="text-3xl font-bold text-[#1C1917]">
              {product.stock}
              <span className="text-base font-normal text-[#78716C] ml-1">unités</span>
            </div>
            <div className="h-2 rounded-full bg-[#E7E5E4]">
              <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${stockPct}%` }} />
            </div>
            <p className="text-xs text-[#78716C]">
              Seuil d&apos;alerte : {product.low_stock_alert} unités
              {product.stock <= product.low_stock_alert && product.stock > 0 && (
                <span className="ml-2 text-amber-600 font-medium flex items-center gap-1 inline-flex">
                  <AlertTriangle className="w-3 h-3" />
                  Stock bas
                </span>
              )}
            </p>
          </div>

          {/* Variants */}
          {product.variants.length > 0 && (
            <div className="bg-white border border-[#E7E5E4] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-[#78716C] uppercase tracking-wide mb-3">Variantes</h2>
              <div className="space-y-2">
                {product.variants.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-[#E7E5E4] last:border-0"
                  >
                    <span className="text-sm text-[#1C1917]">
                      {[v.size, v.color].filter(Boolean).join(' — ') || `Variante ${i + 1}`}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: ShoppingCart, label: 'Commandes totales', value: String(stats.totalOrders) },
          { icon: TrendingUp, label: 'CA livré', value: `${stats.totalRevenue.toFixed(0)} DT` },
          { icon: Package, label: 'Vendu ce mois', value: `${stats.thisMonthQty} unités` },
          { icon: RotateCcw, label: 'Taux de retour', value: `${stats.returnRate}%` },
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
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E5E4]">
            <h2 className="font-semibold text-[#1C1917]">Commandes récentes</h2>
            <Link href="/orders" className="text-sm text-[#16A34A] hover:text-[#15803D] font-medium">
              Voir toutes les commandes →
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
              <tr>
                {['Client', 'Date', 'Statut', 'Qté', 'Montant'].map(h => (
                  <th
                    key={h}
                    className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-5 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-[#FAFAF9] transition-colors">
                  <td className="px-5 py-3 font-medium text-[#1C1917]">
                    {order.customer_name ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-[#78716C]">{formatDate(order.created_at)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3 text-[#78716C]">{order.quantity}</td>
                  <td className="px-5 py-3 font-semibold text-[#1C1917]">{order.cod_amount} DT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock adjustment modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-[#1C1917] mb-1">Ajuster le stock</h3>
            <p className="text-sm text-[#78716C] mb-5">
              Stock actuel : <strong>{product.stock} unités</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1">
                  Nouvelle quantité
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={stockValue}
                  onChange={e => setStockValue(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1">Raison</label>
                <select
                  className="input"
                  value={stockReason}
                  onChange={e => setStockReason(e.target.value)}
                >
                  {ADJUST_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            {stockError && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {stockError}
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowStockModal(false)}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                onClick={handleAdjustStock}
                disabled={isPending}
                className="btn-primary flex-1"
              >
                {isPending ? 'Enregistrement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-[#1C1917] mb-1">Supprimer ce produit ?</h3>
            <p className="text-sm text-[#78716C] mb-4">
              &quot;{product.name}&quot; sera supprimé définitivement. Cette action est irréversible.
            </p>
            {deleteError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary flex-1">
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
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
    </div>
  )
}
