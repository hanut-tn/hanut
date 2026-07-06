'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ImageOff, Minus, Plus } from 'lucide-react'
import {
  buildCartKey, type CartItem, type StorefrontProduct,
} from '@/lib/storefront/cart'
import type { StorefrontDict } from '@/lib/i18n/storefront'

type Props = {
  product: StorefrontProduct
  cart: CartItem[]
  t: StorefrontDict
  isRtl: boolean
  onClose: () => void
  onAdd: (item: Omit<CartItem, 'key'>) => void
}

export default function ProductQuickModal({ product, cart, t, isRtl, onClose, onAdd }: Props) {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    const prevBody = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevBody }
  }, [])

  // Quantité déjà dans le panier pour une variante donnée.
  function inCartQty(label: string | null): number {
    return cart.find(i => i.key === buildCartKey(product.id, label))?.quantity ?? 0
  }

  const selectedVariant = product.variants.find(v => v.label === selectedLabel) ?? null

  const { effectivePrice, remaining, alreadyInCart } = useMemo(() => {
    if (product.hasVariants) {
      if (!selectedVariant) return { effectivePrice: product.price, remaining: 0, alreadyInCart: 0 }
      const inCart = inCartQty(selectedVariant.label)
      return {
        effectivePrice: selectedVariant.price != null && selectedVariant.price >= 0
          ? selectedVariant.price
          : product.price,
        remaining: Math.max(0, Math.min(selectedVariant.qty - inCart, 99)),
        alreadyInCart: inCart,
      }
    }
    const inCart = inCartQty(null)
    return {
      effectivePrice: product.price,
      remaining: Math.max(0, Math.min(product.stock - inCart, 99)),
      alreadyInCart: inCart,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, selectedVariant, cart])

  // Re-borne la quantité quand la variante change.
  useEffect(() => {
    setQuantity(q => Math.max(1, Math.min(q, Math.max(1, remaining))))
  }, [remaining])

  const canAdd = remaining > 0 && (!product.hasVariants || selectedVariant !== null)
  const total = effectivePrice * quantity

  function handleAdd() {
    if (!canAdd) return
    onAdd({
      productId: product.id,
      productName: product.name,
      productImage: product.image_url,
      productPrice: effectivePrice,
      variantLabel: product.hasVariants ? selectedVariant!.label : null,
      quantity,
      maxQty: product.hasVariants ? selectedVariant!.qty : product.stock,
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 max-h-[90dvh] flex flex-col rounded-t-2xl bg-white shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-[#E7E5E4]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-[#E7E5E4] px-4 py-3.5 sm:px-5">
          <h2 className="font-semibold text-[#1C1917] truncate pe-3">{product.name}</h2>
          <button
            onClick={onClose}
            className="text-[#78716C] hover:text-[#1C1917] w-9 h-9 touch-manipulation flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] transition-colors shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
          {/* Produit */}
          <div className="flex gap-3">
            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#F0FDF4] shrink-0 flex items-center justify-center">
              {product.image_url ? (
                <Image src={product.image_url} alt={product.name} fill sizes="80px" className="object-cover" />
              ) : (
                <ImageOff className="w-6 h-6 text-[#78716C] opacity-40" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-brand-600">{effectivePrice} DT</p>
              {product.description && (
                <p className="text-xs text-[#78716C] line-clamp-3 mt-0.5">{product.description}</p>
              )}
            </div>
          </div>

          {/* Variantes */}
          {product.hasVariants && (
            <div>
              <p className="text-sm font-medium text-[#1C1917] mb-2">{t.quick.chooseVariant}</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(v => {
                  const isOut = v.qty === 0
                  const isSelected = selectedLabel === v.label
                  return (
                    <button
                      key={v.label}
                      type="button"
                      disabled={isOut}
                      onClick={() => setSelectedLabel(v.label)}
                      className={`min-h-[44px] touch-manipulation rounded-lg px-3 py-2 text-sm transition-colors ${
                        isOut
                          ? 'border border-[#E7E5E4] opacity-40 cursor-not-allowed line-through'
                          : isSelected
                            ? 'border-2 border-[#16A34A] bg-[#F0FDF4] text-[#166534] font-medium'
                            : 'border border-[#D6D3D1] text-[#44403C] hover:border-[#16A34A]'
                      }`}
                    >
                      {v.label}
                      {v.price != null && !isOut && (
                        <span className="ms-1 text-xs font-semibold">· {v.price} DT</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quantité */}
          <div>
            <p className="text-sm font-medium text-[#1C1917] mb-2">{t.quick.quantity}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-11 h-11 touch-manipulation rounded-lg border border-[#16A34A] flex items-center justify-center text-[#16A34A] hover:bg-green-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="−"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-lg font-bold text-[#1C1917] w-8 text-center tabular-nums">{quantity}</span>
              <button
                type="button"
                disabled={quantity >= remaining}
                onClick={() => setQuantity(q => Math.min(remaining, q + 1))}
                className="w-11 h-11 touch-manipulation rounded-lg border border-[#16A34A] flex items-center justify-center text-[#16A34A] hover:bg-green-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="+"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-xs text-[#78716C]">
                {(!product.hasVariants || selectedVariant) && (
                  <>
                    {t.quick.available(remaining)}
                    {alreadyInCart > 0 && <> · {t.quick.inCart(alreadyInCart)}</>}
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[#E7E5E4] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5 sm:pb-5">
          <button
            type="button"
            disabled={!canAdd}
            onClick={handleAdd}
            className="h-12 w-full touch-manipulation bg-[#16A34A] text-white font-bold rounded-lg text-base transition-all duration-150 ease-out hover:bg-[#15803D] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.quick.addToCart(total)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
