'use client'

import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ImageOff, Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { buildCartKey } from '@/lib/storefront/cart'
import { useFocusTrap } from '@/lib/use-focus-trap'
import type { TemplateProductModalProps } from '../types'

const BORDER = 'color-mix(in srgb, var(--text-primary, #1a1a1a) 15%, transparent)'

export default function LuxeProductModal({ product, cart, t, isRtl, portalContainer, onClose, onAdd }: TemplateProductModalProps) {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef)

  const galleryImages = [product.image_url, ...product.images_gallery].filter((url): url is string => Boolean(url))
  const hasGallery = galleryImages.length > 1
  const [activeImg, setActiveImg] = useState(0)
  const touchStartX = useRef<number | null>(null)

  function goTo(index: number) {
    setActiveImg(Math.max(0, Math.min(galleryImages.length - 1, index)))
  }
  function handleTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 40) return
    goTo(delta < 0 ? activeImg + 1 : activeImg - 1)
  }

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
        style={{ backgroundColor: 'var(--page-bg, #faf8f5)', color: 'var(--text-primary, #1a1a1a)' }}
        className="absolute inset-x-0 bottom-0 max-h-[90dvh] flex flex-col rounded-t-lg shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg text-center"
      >
        <div className="shrink-0 flex items-center justify-between border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <h2 id="quick-modal-title" style={{ fontFamily: 'var(--font-family)' }} className="text-base font-medium truncate pe-3">{product.name}</h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary, #6b5e4e)' }} className="w-9 h-9 touch-manipulation flex items-center justify-center shrink-0" aria-label="Fermer">
            <X className="w-4 h-4" strokeWidth={1.25} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 space-y-5">
          <div
            className="relative aspect-[3/4] max-w-[240px] mx-auto overflow-hidden"
            style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 6%, var(--card-bg, #fff))' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {galleryImages.length > 0 ? (
              <Image key={activeImg} src={galleryImages[activeImg]} alt={product.name} fill sizes="240px" className="object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center"><ImageOff className="w-8 h-8 opacity-30" style={{ color: 'var(--primary)' }} strokeWidth={1} /></span>
            )}
            {hasGallery && (
              <>
                <button
                  type="button"
                  onClick={() => goTo(activeImg - 1)}
                  disabled={activeImg === 0}
                  style={{ backgroundColor: 'color-mix(in srgb, var(--page-bg, #faf8f5) 85%, transparent)', color: 'var(--text-primary, #1a1a1a)' }}
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 touch-manipulation flex items-center justify-center disabled:opacity-0"
                  aria-label="Image précédente"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => goTo(activeImg + 1)}
                  disabled={activeImg === galleryImages.length - 1}
                  style={{ backgroundColor: 'color-mix(in srgb, var(--page-bg, #faf8f5) 85%, transparent)', color: 'var(--text-primary, #1a1a1a)' }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 touch-manipulation flex items-center justify-center disabled:opacity-0"
                  aria-label="Image suivante"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
          {hasGallery && (
            <div className="flex justify-center gap-2 overflow-x-auto scrollbar-none">
              {galleryImages.map((img, i) => (
                <button
                  key={img + i}
                  type="button"
                  onClick={() => goTo(i)}
                  className="relative shrink-0 w-12 h-12 overflow-hidden transition-opacity"
                  style={{ border: i === activeImg ? '2px solid var(--primary)' : `1px solid ${BORDER}`, opacity: i === activeImg ? 1 : 0.6 }}
                >
                  <Image src={img} alt="" fill sizes="48px" className="object-cover" />
                </button>
              ))}
            </div>
          )}

          <div>
            <p className="text-lg font-medium">{effectivePrice} DT</p>
            {product.description && <p style={{ color: 'var(--text-secondary, #6b5e4e)' }} className="text-xs italic mt-1">{product.description}</p>}
          </div>

          {product.hasVariants && (
            <div>
              <p style={{ color: 'var(--text-secondary, #6b5e4e)' }} className="text-[11px] uppercase tracking-wider mb-2">{t.quick.chooseVariant}</p>
              <div className="flex flex-wrap justify-center gap-2">
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
                        color: isOut ? 'var(--text-secondary, #6b5e4e)' : isSelected ? 'var(--primary)' : 'var(--text-primary, #1a1a1a)',
                      }}
                      className={`min-h-[42px] touch-manipulation px-3.5 py-2 text-sm border transition-colors ${isOut ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
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
            <p style={{ color: 'var(--text-secondary, #6b5e4e)' }} className="text-[11px] uppercase tracking-wider mb-2">{t.quick.quantity}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                className="w-10 h-10 touch-manipulation border flex items-center justify-center disabled:opacity-30"
                aria-label={t.quick.decreaseQty}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-base font-medium w-8 text-center tabular-nums">{quantity}</span>
              <button
                type="button"
                disabled={quantity >= remaining}
                onClick={() => setQuantity(q => Math.min(remaining, q + 1))}
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                className="w-10 h-10 touch-manipulation border flex items-center justify-center disabled:opacity-30"
                aria-label={t.quick.increaseQty}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary, #6b5e4e)' }} className="text-xs mt-2">
              {(!product.hasVariants || selectedVariant) && (
                <>{t.quick.available(remaining)}{alreadyInCart > 0 && <> · {t.quick.inCart(alreadyInCart)}</>}</>
              )}
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" style={{ borderColor: BORDER }}>
          <button
            type="button"
            disabled={!canAdd}
            onClick={handleAdd}
            style={canAdd ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : { borderColor: BORDER, color: 'var(--text-secondary, #6b5e4e)' }}
            className="h-12 w-full touch-manipulation border text-sm uppercase tracking-[0.15em] font-medium transition-transform active:scale-[0.98] disabled:cursor-not-allowed"
          >
            {t.quick.addToCart(total)}
          </button>
        </div>
      </div>
    </div>,
    portalContainer ?? document.body
  )
}
