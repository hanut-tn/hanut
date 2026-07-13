'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ImageOff, Minus, Plus } from 'lucide-react'
import { buildCartKey } from '@/lib/storefront/cart'
import { useFocusTrap } from '@/lib/use-focus-trap'
import type { TemplateProductModalProps } from '../types'

export default function FreshProductModal({ product, cart, t, isRtl, portalContainer, onClose, onAdd }: TemplateProductModalProps) {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef)

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

  function inCartQty(label: string | null): number {
    return cart.find(i => i.key === buildCartKey(product.id, label))?.quantity ?? 0
  }

  const selectedVariant = product.variants.find(v => v.label === selectedLabel) ?? null

  const { effectivePrice, remaining, alreadyInCart } = useMemo(() => {
    if (product.hasVariants) {
      if (!selectedVariant) return { effectivePrice: product.price, remaining: 0, alreadyInCart: 0 }
      const inCart = inCartQty(selectedVariant.label)
      return {
        effectivePrice: selectedVariant.price != null && selectedVariant.price >= 0 ? selectedVariant.price : product.price,
        remaining: Math.max(0, Math.min(selectedVariant.qty - inCart, 99)),
        alreadyInCart: inCart,
      }
    }
    const inCart = inCartQty(null)
    return { effectivePrice: product.price, remaining: Math.max(0, Math.min(product.stock - inCart, 99)), alreadyInCart: inCart }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, selectedVariant, cart])

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
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-modal-title"
        style={{ backgroundColor: 'var(--card-bg, #fff)', color: 'var(--text-primary, #14532d)' }}
        className="absolute inset-x-0 bottom-0 max-h-[90dvh] flex flex-col rounded-t-[2rem] shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
      >
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5">
          <h2 id="quick-modal-title" className="font-extrabold truncate pe-3">{product.name}</h2>
          <button
            onClick={onClose}
            style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}
            className="w-9 h-9 touch-manipulation rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 10%, var(--card-bg, #fff))' }}>
            {product.image_url ? (
              <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 640px) 100vw, 448px" className="object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center"><ImageOff className="w-8 h-8 opacity-40" style={{ color: 'var(--primary)' }} /></span>
            )}
          </div>

          <div>
            <p style={{ color: 'var(--primary)' }} className="text-lg font-extrabold">{effectivePrice} DT</p>
            {product.description && <p style={{ color: 'var(--text-secondary, #166534)' }} className="text-xs mt-0.5">{product.description}</p>}
          </div>

          {product.hasVariants && (
            <div>
              <p className="text-sm font-bold mb-2">{t.quick.chooseVariant}</p>
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
                      style={isOut ? {} : isSelected
                        ? { backgroundColor: 'var(--primary)', color: '#fff' }
                        : { backgroundColor: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}
                      className={`min-h-[42px] touch-manipulation rounded-full px-3.5 py-2 text-sm font-medium transition-transform active:scale-95 ${
                        isOut ? 'opacity-40 cursor-not-allowed line-through bg-gray-100' : ''
                      }`}
                    >
                      {v.label}
                      {v.price != null && !isOut && <span className="ms-1 text-xs">· {v.price} DT</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-bold mb-2">{t.quick.quantity}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }}
                className="w-11 h-11 touch-manipulation rounded-full flex items-center justify-center disabled:opacity-30 transition-transform active:scale-90"
                aria-label={t.quick.decreaseQty}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-lg font-extrabold w-8 text-center tabular-nums">{quantity}</span>
              <button
                type="button"
                disabled={quantity >= remaining}
                onClick={() => setQuantity(q => Math.min(remaining, q + 1))}
                style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }}
                className="w-11 h-11 touch-manipulation rounded-full flex items-center justify-center disabled:opacity-30 transition-transform active:scale-90"
                aria-label={t.quick.increaseQty}
              >
                <Plus className="w-4 h-4" />
              </button>
              <span style={{ color: 'var(--text-secondary, #166534)' }} className="text-xs">
                {(!product.hasVariants || selectedVariant) && (
                  <>{t.quick.available(remaining)}{alreadyInCart > 0 && <> · {t.quick.inCart(alreadyInCart)}</>}</>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={!canAdd}
            onClick={handleAdd}
            style={canAdd ? { background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' } : {}}
            className="h-12 w-full touch-manipulation text-white font-bold rounded-full transition-transform active:scale-[0.98] disabled:opacity-40 disabled:bg-gray-300 flex items-center justify-center gap-1.5"
          >
            {t.quick.addToCart(total)} {canAdd && <span aria-hidden>✨</span>}
          </button>
        </div>
      </div>
    </div>,
    portalContainer ?? document.body
  )
}
