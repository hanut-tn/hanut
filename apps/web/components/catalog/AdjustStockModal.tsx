'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { X, PackagePlus, Settings, AlertTriangle, RotateCcw, ArrowRight } from 'lucide-react'
import type { Product, ProductVariant } from '@hanut/types'
import type { StockAdjustmentInput } from '@/app/(dashboard)/catalog/actions'
import { getVariantLabel } from '@/lib/variants'

type AdjustType = 'restock' | 'correction' | 'loss' | 'return'

const TYPES: { value: AdjustType; label: string; icon: React.ElementType }[] = [
  { value: 'restock',    label: 'Réappro',    icon: PackagePlus },
  { value: 'correction', label: 'Correction', icon: Settings },
  { value: 'loss',       label: 'Perte',      icon: AlertTriangle },
  { value: 'return',     label: 'Retour fourn.', icon: RotateCcw },
]

type Props = {
  product: Product
  adjustStock: (id: string, input: StockAdjustmentInput) => Promise<{ error?: string }>
  onClose: () => void
  onSuccess: (updated: { stock: number; variants: ProductVariant[] }) => void
}

export default function AdjustStockModal({ product, adjustStock, onClose, onSuccess }: Props) {
  const [type, setType] = useState<AdjustType>('restock')
  const [qty, setQty] = useState('')
  const [variantValues, setVariantValues] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const hasVariants = product.variants.length > 0

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isPending, onClose])

  useEffect(() => {
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [])

  // Changement de type : les valeurs saisies changent de sens (delta vs absolu),
  // on les efface pour éviter un ajustement involontaire.
  function switchType(next: AdjustType) {
    setType(next)
    setQty('')
    setVariantValues({})
    setError(null)
  }

  // Nouveau stock par variante (preview temps réel). value vide = inchangé.
  function nextVariantQty(v: ProductVariant, raw: string | undefined): number {
    if (raw === undefined || raw === '') return v.qty
    const value = Math.max(0, parseInt(raw) || 0)
    if (type === 'correction') return value
    if (type === 'restock') return v.qty + value
    return v.qty - value // loss / return
  }

  const preview = useMemo(() => {
    if (hasVariants) {
      const perVariant = product.variants.map((v, i) => {
        const label = getVariantLabel(v, i)
        return { label, current: v.qty, next: nextVariantQty(v, variantValues[label]) }
      })
      return {
        perVariant,
        total: perVariant.reduce((s, r) => s + Math.max(0, r.next), 0),
        hasNegative: perVariant.some(r => r.next < 0),
        hasChange: perVariant.some(r => r.next !== r.current),
      }
    }
    const value = Math.max(0, parseInt(qty) || 0)
    const next = qty === ''
      ? product.stock
      : type === 'correction' ? value
      : type === 'restock' ? product.stock + value
      : product.stock - value
    return {
      perVariant: null,
      total: next,
      hasNegative: next < 0,
      hasChange: next !== product.stock,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasVariants, product, variantValues, qty, type])

  const needsNotes = type === 'loss' && notes.trim().length === 0
  const canSubmit = preview.hasChange && !preview.hasNegative && !needsNotes && !isPending

  function handleSubmit() {
    setError(null)
    const input: StockAdjustmentInput = hasVariants
      ? {
          type,
          quantity: 0,
          notes: notes.trim() || null,
          variantAdjustments: Object.entries(variantValues)
            .filter(([, raw]) => raw !== '')
            .map(([label, raw]) => ({ label, value: Math.max(0, parseInt(raw) || 0) })),
        }
      : {
          type,
          quantity: Math.max(0, parseInt(qty) || 0),
          notes: notes.trim() || null,
        }

    startTransition(async () => {
      const result = await adjustStock(product.id, input)
      if (result?.error) {
        setError(result.error)
        return
      }
      const updatedVariants = product.variants.map((v, i) => ({
        ...v,
        qty: Math.max(0, nextVariantQty(v, variantValues[getVariantLabel(v, i)])),
      }))
      onSuccess({ stock: Math.max(0, preview.total), variants: updatedVariants })
    })
  }

  const qtyLabel = type === 'correction' ? 'Nouveau stock' : 'Quantité'

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden overscroll-contain bg-white sm:flex sm:items-center sm:justify-center sm:bg-black/40 sm:p-4">
      <div className="fixed inset-0 z-[101] flex h-[100dvh] w-full flex-col bg-white shadow-xl sm:relative sm:inset-auto sm:z-auto sm:h-auto sm:max-h-[calc(100dvh-4rem)] sm:max-w-lg sm:rounded-xl sm:border sm:border-[#E7E5E4]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="font-semibold text-[#1C1917]">Ajuster le stock</h2>
            <p className="text-sm text-[#78716C] truncate">
              {product.name}
              {hasVariants && ` — ${product.variants.length} variante${product.variants.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-[#78716C] hover:text-[#1C1917] w-10 h-10 touch-manipulation flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] transition-colors shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6 [-webkit-overflow-scrolling:touch]">
          {/* Type */}
          <div>
            <p className="text-sm font-medium text-[#1C1917] mb-2">Type d&apos;ajustement</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => switchType(value)}
                  className={`min-h-[44px] touch-manipulation flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    type === value
                      ? 'border-[#16A34A] bg-[#F0FDF4] text-[#0B5E46] font-medium'
                      : 'border-[#E7E5E4] text-[#78716C] hover:border-[#D6D3D1]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {hasVariants ? (
            /* Grille variantes : une valeur par variante, preview du nouveau stock */
            <div>
              <div className="grid grid-cols-[1fr_auto_88px_auto] items-center gap-x-3 gap-y-2">
                <span className="text-xs font-medium text-[#78716C]">Variante</span>
                <span className="text-xs font-medium text-[#78716C] text-right">Stock</span>
                <span className="text-xs font-medium text-[#78716C]">
                  {type === 'correction' ? 'Nouveau' : 'Ajust.'}
                </span>
                <span />
                {product.variants.map((v, i) => {
                  const label = getVariantLabel(v, i)
                  const row = preview.perVariant?.find(r => r.label === label)
                  const changed = row && row.next !== row.current
                  return (
                    <VariantRow
                      key={label}
                      label={label}
                      current={v.qty}
                      value={variantValues[label] ?? ''}
                      next={row?.next ?? v.qty}
                      changed={!!changed}
                      onChange={raw => setVariantValues(prev => ({ ...prev, [label]: raw }))}
                    />
                  )
                })}
              </div>
              <p className="mt-3 text-xs text-[#78716C]">
                Seules les variantes avec une valeur remplie sont ajustées.
                {type !== 'correction' && ' La valeur est une quantité à ' + (type === 'restock' ? 'ajouter' : 'retirer') + '.'}
              </p>
            </div>
          ) : (
            /* Produit simple */
            <div className="space-y-3">
              <p className="text-sm text-[#78716C]">
                Stock actuel : <span className="font-semibold text-[#1C1917]">{product.stock}</span>
              </p>
              <div>
                <label htmlFor="adjust-qty" className="block text-sm font-medium text-[#1C1917] mb-1">
                  {qtyLabel}
                </label>
                <input
                  id="adjust-qty"
                  className="input"
                  type="number"
                  min="0"
                  value={qty}
                  onChange={e => setQty(e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                  autoFocus
                />
              </div>
              {preview.hasChange && (
                <p className={`text-sm flex items-center gap-1.5 ${preview.hasNegative ? 'text-red-600' : 'text-[#0B5E46]'}`}>
                  {product.stock}
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span className="font-bold">{preview.total}</span>
                  {preview.hasNegative && ' — stock insuffisant'}
                </p>
              )}
            </div>
          )}

          {/* Total variantes */}
          {hasVariants && preview.hasChange && (
            <div className={`rounded-lg px-3 py-2 text-sm flex items-center justify-between ${
              preview.hasNegative ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-[#F0FDF4] border border-[#BBF7D0] text-[#0B5E46]'
            }`}>
              <span>{preview.hasNegative ? 'Stock insuffisant sur une variante' : 'Nouveau stock total'}</span>
              {!preview.hasNegative && <span className="font-bold">{preview.total}</span>}
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="adjust-notes" className="block text-sm font-medium text-[#1C1917] mb-1">
              Notes {type === 'loss' ? <span className="text-red-500">*</span> : <span className="text-[#78716C] font-normal">(optionnel)</span>}
            </label>
            <textarea
              id="adjust-notes"
              className="input resize-none"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={type === 'loss' ? 'Raison de la perte (obligatoire)…' : 'Fournisseur, référence…'}
            />
          </div>

          {type === 'restock' && (
            <p className="text-xs text-[#78716C]">
              Pour renseigner un prix d&apos;achat (coût moyen pondéré), passez par la fiche produit.
            </p>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex flex-col-reverse gap-2 border-t border-[#E7E5E4] bg-white px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:px-6 sm:pb-4">
          <button type="button" onClick={onClose} disabled={isPending} className="btn-secondary flex-1">
            Annuler
          </button>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="btn-primary flex-1">
            {isPending ? 'Ajustement…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function VariantRow({
  label, current, value, next, changed, onChange,
}: {
  label: string
  current: number
  value: string
  next: number
  changed: boolean
  onChange: (raw: string) => void
}) {
  return (
    <>
      <span className="text-sm text-[#1C1917] truncate">{label}</span>
      <span className="text-sm text-[#78716C] text-right tabular-nums">{current}</span>
      <input
        className="input py-1.5 text-sm"
        type="number"
        min="0"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder="—"
        aria-label={`Ajustement pour ${label}`}
      />
      <span className={`text-sm tabular-nums min-w-[3.5rem] ${
        !changed ? 'text-[#A8A29E]' : next < 0 ? 'text-red-600 font-semibold' : 'text-[#0B5E46] font-semibold'
      }`}>
        {changed ? `→ ${next}` : ''}
      </span>
    </>
  )
}
