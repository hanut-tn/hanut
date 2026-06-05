'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Package, ImageOff, X } from 'lucide-react'
import type { StockAdjustmentInput } from '@/app/(dashboard)/catalog/actions'
import type { RestockOrderInput } from '@/app/(dashboard)/catalog/restock-actions'

export type LowStockProduct = {
  id: string
  name: string
  stock: number
  low_stock_alert: number
  image_url: string | null
  price: number
  cost: number | null
}

type Props = {
  products: LowStockProduct[]
  adjustStock: (id: string, input: StockAdjustmentInput) => Promise<{ error?: string }>
  createRestockOrder: (productId: string, input: RestockOrderInput) => Promise<{ error?: string; id?: string }>
}

export default function LowStockWidget({ products, adjustStock, createRestockOrder }: Props) {
  const [stockState, setStockState] = useState<Record<string, number>>(
    Object.fromEntries(products.map(p => [p.id, p.stock]))
  )
  const [activeModal, setActiveModal] = useState<LowStockProduct | null>(null)

  const sorted = [...products].sort((a, b) => {
    const sa = stockState[a.id] ?? a.stock
    const sb = stockState[b.id] ?? b.stock
    if (sa === 0 && sb !== 0) return -1
    if (sb === 0 && sa !== 0) return 1
    return sa - sb
  })

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-[#78716C]" />
          <h2 className="text-base font-semibold text-[#1C1917]">Stock à surveiller</h2>
        </div>
        <Link href="/catalog" className="text-sm text-[#16A34A] hover:text-[#15803D] font-medium">
          Voir tout →
        </Link>
      </div>

      <div className="divide-y divide-[#E7E5E4]">
        {sorted.slice(0, 5).map(product => {
          const displayStock = stockState[product.id] ?? product.stock
          const isOut = displayStock === 0
          const maxRef = Math.max(product.low_stock_alert * 4, displayStock, 10)
          const pct = Math.min((displayStock / maxRef) * 100, 100)
          const barColor = isOut ? 'bg-red-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-400'

          return (
            <div key={product.id} className="flex items-center gap-3 py-2.5">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-[#F0FDF4] shrink-0 flex items-center justify-center">
                {product.image_url ? (
                  <Image src={product.image_url} alt={product.name} fill sizes="32px" className="object-cover" />
                ) : (
                  <ImageOff className="w-3.5 h-3.5 text-[#78716C] opacity-40" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1C1917] truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#78716C]">{displayStock} unités</span>
                  <div className="h-1.5 w-14 rounded-full bg-[#E7E5E4]">
                    <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                  isOut
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {isOut ? 'Rupture' : 'Stock bas'}
                </span>
                <button
                  onClick={() => setActiveModal(product)}
                  className="text-xs bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] hover:bg-green-100 px-2.5 py-1 rounded-lg font-medium transition-colors"
                >
                  +Stock
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {activeModal && (
        <QuickRestockModal
          product={activeModal}
          currentStock={stockState[activeModal.id] ?? activeModal.stock}
          onClose={() => setActiveModal(null)}
          onSuccess={newStock => {
            setStockState(prev => ({ ...prev, [activeModal.id]: newStock }))
            setActiveModal(null)
          }}
          adjustStock={adjustStock}
          createRestockOrder={createRestockOrder}
        />
      )}
    </div>
  )
}

function QuickRestockModal({
  product,
  currentStock,
  onClose,
  onSuccess,
  adjustStock,
  createRestockOrder,
}: {
  product: LowStockProduct
  currentStock: number
  onClose: () => void
  onSuccess: (newStock: number) => void
  adjustStock: (id: string, input: StockAdjustmentInput) => Promise<{ error?: string }>
  createRestockOrder: (productId: string, input: RestockOrderInput) => Promise<{ error?: string; id?: string }>
}) {
  const [isPending, startTransition] = useTransition()
  const [qty, setQty] = useState(0)
  const [isPlanned, setIsPlanned] = useState(false)
  const [supplier, setSupplier] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const canConfirm = qty > 0

  function handleConfirm() {
    if (!canConfirm || isPending) return
    setError(null)
    startTransition(async () => {
      if (isPlanned) {
        const result = await createRestockOrder(product.id, {
          totalQuantity: qty,
          supplier: supplier.trim() || null,
          expectedDate: expectedDate || null,
        })
        if (result?.error) setError(result.error)
        else onSuccess(currentStock)
      } else {
        const result = await adjustStock(product.id, { type: 'restock', quantity: qty, supplier: supplier.trim() || null })
        if (result?.error) setError(result.error)
        else onSuccess(currentStock + qty)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center sm:justify-center sm:p-4">
      <div className="w-full bg-white rounded-t-2xl sm:rounded-xl sm:max-w-sm shadow-xl">
        <div className="px-5 pt-5 pb-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-[#1C1917]">Réapprovisionner</h3>
              <p className="text-sm text-[#78716C] mt-0.5 truncate">
                {product.name} · <span className="font-bold text-[#0B5E46]">{currentStock} unités</span>
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] text-[#78716C]">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Received / Planned toggle */}
          <div className="flex rounded-xl border border-[#E7E5E4] overflow-hidden">
            {[{ id: false, label: 'Déjà reçu' }, { id: true, label: 'Planifié' }].map(opt => (
              <button
                key={String(opt.id)}
                type="button"
                onClick={() => setIsPlanned(opt.id)}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  isPlanned === opt.id ? 'bg-[#0B5E46] text-white' : 'text-[#78716C] hover:bg-[#F5F5F4]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">Quantité</label>
            <div className="flex items-center gap-2">
              <span className="text-[#16A34A] font-bold text-lg">+</span>
              <input
                className="input flex-1"
                type="number"
                inputMode="numeric"
                min="0"
                value={qty || ''}
                onChange={e => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
                autoFocus
              />
            </div>
            {!isPlanned && qty > 0 && (
              <p className="text-xs text-[#78716C] mt-1">
                Stock après : {currentStock} + {qty} = <strong className="text-[#0B5E46]">{currentStock + qty} unités</strong>
              </p>
            )}
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">Fournisseur (optionnel)</label>
            <input className="input" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Ex: Fournisseur Sfax" />
          </div>

          {isPlanned && (
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Date de réception prévue</label>
              <input className="input" type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
            </div>
          )}

          {isPlanned && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Le stock sera mis à jour à la réception. Confirmez depuis la fiche produit.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="border-t border-[#E7E5E4] px-5 py-4 flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button
            onClick={handleConfirm}
            disabled={isPending || !canConfirm}
            className="btn-primary flex-1 disabled:opacity-40"
          >
            {isPending ? '...' : isPlanned ? 'Planifier' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}
