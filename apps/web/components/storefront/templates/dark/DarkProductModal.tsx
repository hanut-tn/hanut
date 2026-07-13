'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ImageOff, Minus, Plus } from 'lucide-react'
import { buildCartKey } from '@/lib/storefront/cart'
import { useFocusTrap } from '@/lib/use-focus-trap'
import type { TemplateProductModalProps } from '../types'

const BORDER = 'rgba(255,255,255,0.1)'

export default function DarkProductModal({ product, cart, t, isRtl, portalContainer, onClose, onAdd }: TemplateProductModalProps) {
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
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-modal-title"
        style={{ backgroundColor: '#0f0f0f', color: '#fff', border: `1px solid ${BORDER}` }}
        className="absolute inset-x-0 bottom-0 max-h-[90dvh] flex flex-col shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2"
      >
        <div className="shrink-0 flex items-center justify-between border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <h2 id="quick-modal-title" className="font-black uppercase tracking-tight truncate pe-3">{product.name}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white w-9 h-9 touch-manipulation flex items-center justify-center shrink-0" aria-label="Fermer">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
          <div className="relative aspect-square" style={{ backgroundColor: '#1a1a1a', border: `1px solid ${BORDER}` }}>
            {product.image_url ? (
              <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 640px) 100vw, 448px" className="object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center"><ImageOff className="w-8 h-8 text-white/20" strokeWidth={1.25} /></span>
            )}
          </div>

          <div>
            <p style={{ color: 'var(--primary)', textShadow: '0 0 12px color-mix(in srgb, var(--primary) 45%, transparent)' }} className="text-lg font-black">
              <span aria-hidden>◈</span> {effectivePrice} DT
            </p>
            {product.description && <p className="text-xs text-white/50 line-clamp-3 mt-0.5">{product.description}</p>}
          </div>

          {product.hasVariants && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">{t.quick.chooseVariant}</p>
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
                      style={{
                        borderColor: isSelected ? 'var(--primary)' : BORDER,
                        color: isOut ? 'rgba(255,255,255,0.3)' : isSelected ? 'var(--primary)' : '#fff',
                        boxShadow: isSelected ? '0 0 10px color-mix(in srgb, var(--primary) 40%, transparent)' : 'none',
                      }}
                      className={`min-h-[42px] touch-manipulation px-3.5 py-2 text-sm border font-medium transition-colors ${isOut ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
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
            <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">{t.quick.quantity}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                style={{ borderColor: 'rgba(255,255,255,0.4)' }}
                className="w-10 h-10 touch-manipulation border text-white flex items-center justify-center disabled:opacity-30 hover:border-white"
                aria-label={t.quick.decreaseQty}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-base font-bold w-8 text-center tabular-nums">{quantity}</span>
              <button
                type="button"
                disabled={quantity >= remaining}
                onClick={() => setQuantity(q => Math.min(remaining, q + 1))}
                style={{ borderColor: 'rgba(255,255,255,0.4)' }}
                className="w-10 h-10 touch-manipulation border text-white flex items-center justify-center disabled:opacity-30 hover:border-white"
                aria-label={t.quick.increaseQty}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-white/40">
                {(!product.hasVariants || selectedVariant) && (
                  <>{t.quick.available(remaining)}{alreadyInCart > 0 && <> · {t.quick.inCart(alreadyInCart)}</>}</>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" style={{ borderColor: BORDER }}>
          <button
            type="button"
            disabled={!canAdd}
            onClick={handleAdd}
            style={canAdd ? { background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', boxShadow: '0 0 20px color-mix(in srgb, var(--primary) 40%, transparent)' } : {}}
            className="h-12 w-full touch-manipulation text-white font-bold uppercase tracking-wider transition-transform active:scale-[0.98] disabled:opacity-30 disabled:bg-white/10"
          >
            {t.quick.addToCart(total)}
          </button>
        </div>
      </div>
    </div>,
    portalContainer ?? document.body
  )
}
