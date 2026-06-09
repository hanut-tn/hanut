'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import type { Product } from '@hanut/types'
import { PackageX, Package, Copy, ExternalLink } from 'lucide-react'
import { TUNISIAN_GOVERNORATES, isValidTunisianPhone, formatTunisianPhone } from '@/lib/constants'
import { getVariantLabel } from '@/lib/variants'

type Props = {
  sellerSlug: string
  sellerName: string
  products: Product[]
}

type Submitted = { orderId: string; fullId: string; trackingToken: string | null }
type StockErrorScope = 'product' | 'variant'

function getVariantKey(productId: string, label: string) {
  return `${productId}::${label}`
}

export default function OrderForm({ sellerSlug, sellerName, products: initialProducts }: Props) {
  const formTopRef = useRef<HTMLFormElement>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [productId, setProductId] = useState('')
  const [variant, setVariant] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stockError, setStockError] = useState<string | null>(null)
  const [stockErrorScope, setStockErrorScope] = useState<StockErrorScope>('product')
  const [exhaustedIds, setExhaustedIds] = useState<Set<string>>(new Set())
  const [exhaustedVariantKeys, setExhaustedVariantKeys] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState<Submitted | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const visibleProducts = initialProducts.filter(p => {
    if (exhaustedIds.has(p.id)) return false
    if (p.variants.length === 0) return true
    return p.variants.some((v, i) => {
      const label = getVariantLabel(v, i)
      return v.qty > 0 && !exhaustedVariantKeys.has(getVariantKey(p.id, label))
    })
  })
  const selectedProduct = visibleProducts.find(p => p.id === productId)
  const hasVariants = (selectedProduct?.variants.length ?? 0) > 0

  const selectedVariant = hasVariants
    ? selectedProduct?.variants.find((v, i) => {
        const label = getVariantLabel(v, i)
        return label === variant
      })
    : undefined

  const maxQty = selectedVariant
    ? selectedVariant.qty
    : (selectedProduct?.stock ?? 99)

  // Reset variant + quantity when product changes
  useEffect(() => {
    setVariant('')
    setQuantity(1)
    setStockError(null)
  }, [productId])

  // Auto-fix quantity when variant changes
  useEffect(() => {
    if (selectedVariant) {
      if (selectedVariant.qty === 0) setQuantity(1)
      else if (selectedVariant.qty === 1) setQuantity(1)
      else setQuantity(q => Math.min(q, selectedVariant.qty))
    }
  }, [selectedVariant])

  function handlePhoneChange(value: string) {
    const cleaned = formatTunisianPhone(value)
    setPhone(cleaned)
    if (cleaned.length === 8 && !isValidTunisianPhone(cleaned)) {
      setPhoneError('Numéro tunisien invalide. Ex: 22 123 456')
    } else {
      setPhoneError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStockError(null)

    if (!isValidTunisianPhone(phone)) {
      setError('Numéro de téléphone invalide. Entrez 8 chiffres (ex: 22 123 456).')
      return
    }
    if (!productId) {
      setError('Sélectionnez un produit.')
      return
    }
    if (hasVariants && !variant) {
      setError('Veuillez choisir une variante.')
      return
    }
    if (selectedProduct && quantity > maxQty) {
      setError(`Stock disponible : ${maxQty} unité(s).`)
      return
    }

    const phoneDigits = phone.replace(/\D/g, '')

    setLoading(true)
    try {
      const res = await fetch('/api/orders/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: sellerSlug,
          customer_name: name.trim(),
          customer_phone: phoneDigits,
          customer_address: address.trim(),
          customer_city: city,
          product_id: productId,
          variant: variant || undefined,
          quantity,
          notes: notes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        const msg: string = data.error ?? 'Une erreur est survenue. Réessayez.'
        const isStockError = msg.toLowerCase().includes('insuffisant') || msg.toLowerCase().includes('stock')
        if (isStockError) {
          setStockError(msg)
          if (hasVariants && variant && selectedProduct) {
            const exhaustedKey = getVariantKey(productId, variant)
            const hasOtherAvailableVariant = selectedProduct.variants.some((v, i) => {
              const label = getVariantLabel(v, i)
              if (label === variant) return false
              return v.qty > 0 && !exhaustedVariantKeys.has(getVariantKey(productId, label))
            })
            setStockErrorScope(hasOtherAvailableVariant ? 'variant' : 'product')
            setExhaustedVariantKeys(prev => new Set([...prev, exhaustedKey]))
            if (!hasOtherAvailableVariant) {
              setExhaustedIds(prev => new Set([...prev, productId]))
            }
            setVariant('')
            setQuantity(1)
          } else {
            setStockErrorScope('product')
            setExhaustedIds(prev => new Set([...prev, productId]))
          }
        } else {
          setError(msg)
        }
        return
      }
      setSubmitted({ orderId: (data.order_id as string).slice(0, 8).toUpperCase(), fullId: data.order_id as string, trackingToken: (data.tracking_token as string | null) ?? null })
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.')
    } finally {
      setLoading(false)
    }
  }

  // ── Confirmation screen ──────────────────────────────────────────────────────
  if (submitted) {
    const trackUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/track/${submitted.trackingToken ?? submitted.fullId}`

    return (
      <div className="flex flex-col items-center text-center py-10 space-y-5">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="19" stroke="#16A34A" strokeWidth="2"/>
            <path d="M12 20L17 25L28 14" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]">Commande envoyée !</h2>
          <p className="text-gray-500 mt-2 max-w-sm">
            Le vendeur <span className="font-semibold text-[#1C1917]">{sellerName}</span> vous contactera pour confirmer votre commande.
          </p>
        </div>

        <div className="bg-[#F5F5F4] rounded-xl px-6 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Numéro de commande</p>
          <p className="text-xl font-bold text-[#0B5E46] tracking-wider font-mono">#{submitted.orderId}</p>
        </div>

        <div className="w-full bg-white border border-[#E7E5E4] rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-[#1C1917]">Suivre ma commande</p>
          <a
            href={trackUrl}
            className="flex items-center justify-center gap-2 min-h-[44px] w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold rounded-xl text-sm transition-colors touch-manipulation"
          >
            <ExternalLink className="w-4 h-4" />
            Voir le statut de ma commande
          </a>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(trackUrl).catch(() => {})
            }}
            className="flex items-center justify-center gap-2 min-h-[44px] w-full border border-[#E7E5E4] text-[#78716C] rounded-xl text-sm hover:bg-[#F5F5F4] transition-colors touch-manipulation"
          >
            <Copy className="w-4 h-4" />
            Copier le lien de suivi
          </button>
        </div>

        <button
          onClick={() => {
            setSubmitted(null)
            setName(''); setPhone(''); setCity(''); setAddress('')
            setProductId(''); setVariant(''); setQuantity(1); setNotes('')
          }}
          className="min-h-[44px] touch-manipulation text-sm font-medium text-[#16A34A] hover:underline"
        >
          Passer une autre commande →
        </button>
      </div>
    )
  }

  // ── Order form ───────────────────────────────────────────────────────────────
  return (
    <form ref={formTopRef} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[#1C1917]">Passer une commande</h1>
        <p className="text-sm text-gray-500 mt-0.5">chez <span className="font-medium">{sellerName}</span></p>
      </div>

      {/* ── Coordonnées ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <p className="text-sm font-bold text-[#1C1917] flex items-center gap-2">
          <span className="w-5 h-5 bg-[#0B5E46] rounded-full text-white text-xs flex items-center justify-center">1</span>
          Vos coordonnées
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet *</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Prénom Nom"
            required
            autoComplete="name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Numéro de téléphone *
            <span className="text-gray-400 font-normal ml-1">(8 chiffres)</span>
          </label>
          <div className="flex gap-2">
            <span className="flex items-center px-3 bg-[#F5F5F4] border border-gray-200 rounded-xl text-base font-medium text-gray-500 shrink-0">
              +216
            </span>
            <input
              className={`min-w-0 flex-1 border rounded-xl px-4 py-3 text-base outline-none focus:ring-2 transition ${phoneError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-[#16A34A] focus:ring-green-100'}`}
              type="tel"
              value={phone}
              onChange={e => handlePhoneChange(e.target.value)}
              placeholder="22 123 456"
              maxLength={8}
              required
              inputMode="numeric"
              autoComplete="tel"
            />
          </div>
          {phoneError && <p className="text-xs text-red-600 mt-1">{phoneError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Gouvernorat *</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition bg-white"
            value={city}
            onChange={e => setCity(e.target.value)}
            required
          >
            <option value="">Sélectionner…</option>
            {TUNISIAN_GOVERNORATES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse complète *</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Rue, numéro, quartier…"
            required
            autoComplete="street-address"
          />
        </div>
      </div>

      {/* ── Produit ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <p className="text-sm font-bold text-[#1C1917] flex items-center gap-2">
          <span className="w-5 h-5 bg-[#0B5E46] rounded-full text-white text-xs flex items-center justify-center">2</span>
          Votre commande
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Produit *</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition bg-white"
            value={productId}
            onChange={e => setProductId(e.target.value)}
            required
          >
            <option value="">Sélectionner un produit…</option>
            {visibleProducts.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.price} DT
              </option>
            ))}
          </select>

          {selectedProduct && (
            <div className="mt-2 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 flex items-center gap-3 transition-all duration-200">
              {selectedProduct.image_url ? (
                <Image
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 bg-[#E7E5E4] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-[#78716C]" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-[#1C1917]">{selectedProduct.name}</p>
                <p className="text-sm font-bold text-[#16A34A]">{selectedProduct.price} DT</p>
                <p className="text-xs text-[#78716C]">
                  Stock disponible : {selectedProduct.stock} unité{selectedProduct.stock !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Variantes — pills */}
        {selectedProduct && hasVariants && (
          <div>
            <p className="text-sm font-medium text-[#1C1917] mb-2">Choisissez votre variante</p>
            <div className="flex flex-wrap gap-2">
              {selectedProduct.variants.map((v, i) => {
                const label = getVariantLabel(v, i)
                const isSelected = variant === label
                const isOut = v.qty === 0 || exhaustedVariantKeys.has(getVariantKey(selectedProduct.id, label))
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isOut}
                    onClick={() => {
                      setVariant(label)
                      setStockError(null)
                    }}
                    className={`min-h-[44px] touch-manipulation rounded-lg px-3 py-2 text-sm transition-colors ${
                      isOut
                        ? 'border border-[#E7E5E4] opacity-40 cursor-not-allowed line-through'
                        : isSelected
                          ? 'border-2 border-[#16A34A] bg-[#F0FDF4] text-[#166534] font-medium'
                          : 'border border-[#E7E5E4] cursor-pointer hover:border-[#16A34A]'
                    }`}
                  >
                    {label}
                    {isOut ? (
                      <span className="ml-1 text-xs">— épuisée</span>
                    ) : (
                      <span className="ml-1 text-xs text-gray-400">— {v.qty} dispo</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantité *</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-11 h-11 touch-manipulation rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg transition"
            >
              −
            </button>
            <span className="text-lg font-bold text-[#1C1917] w-8 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
              disabled={!selectedProduct || (hasVariants && !variant)}
              className="w-11 h-11 touch-manipulation rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg transition disabled:opacity-40"
            >
              +
            </button>
            {selectedProduct && (
              <span className="text-xs text-gray-400 ml-1">
                {selectedVariant ? `${selectedVariant.qty} dispo` : !hasVariants ? `${selectedProduct.stock} dispo` : ''}
              </span>
            )}
          </div>
        </div>

        {selectedProduct && (
          <div className="bg-[#F5F5F4] rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total à payer (COD)</span>
            <span className="text-lg font-extrabold text-[#0B5E46]">
              {(selectedProduct.price * quantity).toFixed(0)} DT
            </span>
          </div>
        )}
      </div>

      {/* ── Note ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Note pour le vendeur
          <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
        </label>
        <textarea
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition resize-none"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Couleur exacte, taille précise, instructions de livraison…"
        />
      </div>

      {/* Erreur générique */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Erreur stock */}
	      {stockError && (
	        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
	          <PackageX className="text-red-500 w-6 h-6 shrink-0 mt-0.5" />
	          <div className="flex-1">
	            <p className="text-sm font-semibold text-red-700">
	              {stockErrorScope === 'variant' ? 'Cette variante n&apos;est plus disponible' : 'Ce produit n&apos;est plus disponible'}
	            </p>
	            <p className="text-xs text-red-600 mt-1">
	              {stockErrorScope === 'variant'
	                ? 'Le stock de cette variante vient d’être épuisé. Choisissez une autre variante ou un autre produit.'
	                : 'Le stock de ce produit vient d’être épuisé. Choisissez un autre produit ou revenez plus tard.'}
	            </p>
	            <button
	              type="button"
	              onClick={() => {
	                if (stockErrorScope === 'product') setProductId('')
	                setVariant('')
	                setQuantity(1)
	                setStockError(null)
                formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
	              }}
	              className="mt-2 min-h-[44px] touch-manipulation text-xs font-semibold text-red-700 underline underline-offset-2"
	            >
	              {stockErrorScope === 'variant' ? 'Choisir une autre variante' : 'Choisir un autre produit'}
	            </button>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full touch-manipulation bg-[#16A34A] hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-2xl text-base transition-colors shadow-lg shadow-green-200"
      >
        {loading ? 'Envoi en cours…' : 'Passer la commande'}
      </button>

      <p className="text-xs text-center text-gray-400">
        En passant commande, vous acceptez d&apos;être contacté par le vendeur pour confirmation.
      </p>
    </form>
  )
}
