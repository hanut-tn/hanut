'use client'

import { useState, useTransition } from 'react'
import { ShoppingBag } from 'lucide-react'
import type { Product } from '@hanut/types'
import type { ProductInput, ProductVariant } from '@/app/(dashboard)/catalog/actions'

type Props = {
  products: Product[]
  upsertProduct: (input: ProductInput) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
}

const EMPTY: ProductInput = {
  name: '',
  price: 0,
  cost: null,
  stock: 0,
  low_stock_alert: 3,
  variants: [],
}

export default function CatalogClient({ products, upsertProduct, deleteProduct }: Props) {
  const [modal, setModal] = useState<null | 'new' | Product>(null)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)
  const [isPending, startTransition] = useTransition()

  const lowStockCount = products.filter(p => p.stock <= p.low_stock_alert).length

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteProduct(id)
      setConfirmDelete(null)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Catalogue</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            {products.length} produit{products.length !== 1 ? 's' : ''}
            {lowStockCount > 0 && (
              <span className="ml-2 text-orange-600 font-medium">· {lowStockCount} stock bas</span>
            )}
          </p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary text-sm">
          + Nouveau produit
        </button>
      </div>

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-16 text-center">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-40" />
          <p className="font-medium text-[#1C1917]">Aucun produit pour l&apos;instant</p>
          <p className="text-sm text-[#78716C] mt-1">Ajoutez votre premier produit ci-dessus</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
              <tr>
                {['Produit', 'Prix vente', 'Coût / Marge', 'Stock', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {products.map(p => {
                const lowStock = p.stock <= p.low_stock_alert
                const margin = p.cost && p.price > 0
                  ? Math.round(((p.price - p.cost) / p.price) * 100)
                  : null
                return (
                  <tr key={p.id} className="hover:bg-[#FAFAF9] transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-[#1C1917]">{p.name}</p>
                      {p.variants.length > 0 && (
                        <p className="text-xs text-[#78716C] mt-0.5">
                          {p.variants.length} variante{p.variants.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#1C1917]">{p.price} DT</td>
                    <td className="px-5 py-4 text-[#78716C]">
                      {p.cost ? (
                        <span>
                          {p.cost} DT
                          {margin !== null && (
                            <span className="ml-1.5 text-xs font-medium text-[#16A34A] bg-green-50 px-1.5 py-0.5 rounded-full">
                              {margin}%
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        lowStock
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-green-50 text-green-700 border border-green-200'
                      }`}>
                        {p.stock} unités
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setModal(p)}
                          className="text-sm text-[#16A34A] hover:text-[#15803D] font-medium"
                        >
                          Modifier
                        </button>
                        <span className="text-[#E7E5E4]">|</span>
                        <button
                          onClick={() => setConfirmDelete(p)}
                          className="text-sm text-red-500 hover:text-red-700 font-medium"
                        >
                          Supprimer
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

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-[#1C1917] mb-1">Supprimer ce produit ?</h3>
            <p className="text-sm text-[#78716C] mb-5">
              &quot;{confirmDelete.name}&quot; sera supprimé définitivement.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">
                Annuler
              </button>
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

      {/* Product modal */}
      {modal !== null && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={async (input) => {
            await upsertProduct(input)
            setModal(null)
          }}
        />
      )}
    </div>
  )
}

// ─── ProductModal ─────────────────────────────────────────────────────────────

function ProductModal({
  product,
  onClose,
  onSave,
}: {
  product: Product | null
  onClose: () => void
  onSave: (input: ProductInput) => Promise<void>
}) {
  const [form, setForm] = useState<ProductInput>(
    product
      ? {
          id: product.id,
          name: product.name,
          price: product.price,
          cost: product.cost ?? null,
          stock: product.stock,
          low_stock_alert: product.low_stock_alert,
          variants: product.variants,
        }
      : { ...EMPTY }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function addVariant() {
    set('variants', [...form.variants, { size: '', color: '', qty: 1 }])
  }

  function updateVariant(i: number, field: keyof ProductVariant, value: string | number) {
    set('variants', form.variants.map((v, idx) => idx === i ? { ...v, [field]: value } : v))
  }

  function removeVariant(i: number) {
    set('variants', form.variants.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setSaving(false)
    }
  }

  const margin = form.cost && form.price > 0
    ? Math.round(((form.price - form.cost) / form.price) * 100)
    : null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#E7E5E4] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4] sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-[#1C1917]">
            {product ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>
          <button onClick={onClose} className="text-[#78716C] hover:text-[#1C1917] text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] transition-colors">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">
              Nom du produit <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: T-shirt oversize"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">
                Prix de vente (DT) <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.price || ''}
                onChange={e => set('price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">
                Coût de revient (DT)
              </label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.cost ?? ''}
                onChange={e => set('cost', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Optionnel"
              />
            </div>
          </div>

          {margin !== null && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-700 flex items-center gap-2">
              <span className="font-medium">Marge :</span>
              <strong>{margin}%</strong>
              <span className="text-green-600">({(form.price - (form.cost ?? 0)).toFixed(2)} DT par vente)</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">
                Stock <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.stock || ''}
                onChange={e => set('stock', parseInt(e.target.value) || 0)}
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">
                Alerte stock bas
              </label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.low_stock_alert || ''}
                onChange={e => set('low_stock_alert', parseInt(e.target.value) || 0)}
                placeholder="3"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[#1C1917]">Variantes</label>
              <button
                type="button"
                onClick={addVariant}
                className="text-xs text-[#16A34A] hover:text-[#15803D] font-medium"
              >
                + Ajouter une variante
              </button>
            </div>
            {form.variants.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_64px_28px] gap-2 px-1">
                  <span className="text-xs text-[#78716C]">Taille</span>
                  <span className="text-xs text-[#78716C]">Couleur</span>
                  <span className="text-xs text-[#78716C]">Qté</span>
                  <span />
                </div>
                {form.variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_64px_28px] gap-2 items-center">
                    <input
                      className="input text-sm"
                      value={v.size ?? ''}
                      onChange={e => updateVariant(i, 'size', e.target.value)}
                      placeholder="M, L, XL…"
                    />
                    <input
                      className="input text-sm"
                      value={v.color ?? ''}
                      onChange={e => updateVariant(i, 'color', e.target.value)}
                      placeholder="Noir, Blanc…"
                    />
                    <input
                      className="input text-sm"
                      type="number"
                      min="0"
                      value={v.qty}
                      onChange={e => updateVariant(i, 'qty', parseInt(e.target.value) || 0)}
                    />
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      className="text-[#78716C] hover:text-red-500 text-xl leading-none flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Enregistrement...' : product ? 'Mettre à jour' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
