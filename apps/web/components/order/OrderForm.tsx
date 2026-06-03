'use client'

import { useState, useEffect } from 'react'
import type { Product } from '@hanut/types'

const GOUVERNORATS = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
  'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Kef', 'Mahdia',
  'Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid',
  'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
]

type Props = {
  sellerSlug: string
  sellerName: string
  products: Product[]
}

type Submitted = { orderId: string }

export default function OrderForm({ sellerSlug, sellerName, products }: Props) {
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
  const [submitted, setSubmitted] = useState<Submitted | null>(null)

  const selectedProduct = products.find(p => p.id === productId)

  // Reset variant when product changes
  useEffect(() => {
    setVariant('')
    setQuantity(1)
  }, [productId])

  function validatePhone(v: string) {
    const digits = v.replace(/\D/g, '')
    return digits.length === 8
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!validatePhone(phone)) {
      setError('Numéro de téléphone invalide. Entrez 8 chiffres (ex: 20 123 456).')
      return
    }
    if (!productId) {
      setError('Sélectionnez un produit.')
      return
    }
    if (selectedProduct && quantity > selectedProduct.stock) {
      setError(`Stock disponible : ${selectedProduct.stock} unité(s).`)
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
        setError(data.error ?? 'Une erreur est survenue. Réessayez.')
        return
      }
      setSubmitted({ orderId: (data.order_id as string).slice(0, 8).toUpperCase() })
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.')
    } finally {
      setLoading(false)
    }
  }

  // ── Confirmation screen ────────────────────────────────────────────────────
  if (submitted) {
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
            Vous recevrez un SMS de confirmation de la part de{' '}
            <span className="font-semibold text-[#1C1917]">{sellerName}</span> sous peu.
          </p>
        </div>
        <div className="bg-[#F5F5F4] rounded-xl px-6 py-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Numéro de commande</p>
          <p className="text-xl font-bold text-[#0B5E46] tracking-wider">#{submitted.orderId}</p>
        </div>
        <button
          onClick={() => {
            setSubmitted(null)
            setName(''); setPhone(''); setCity(''); setAddress('')
            setProductId(''); setVariant(''); setQuantity(1); setNotes('')
          }}
          className="text-sm font-medium text-[#16A34A] hover:underline"
        >
          Passer une autre commande →
        </button>
      </div>
    )
  }

  // ── Order form ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition"
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
            <span className="flex items-center px-3 bg-[#F5F5F4] border border-gray-200 rounded-xl text-sm font-medium text-gray-500 shrink-0">
              +216
            </span>
            <input
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="20 123 456"
              required
              inputMode="numeric"
              autoComplete="tel"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Gouvernorat *</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition bg-white"
            value={city}
            onChange={e => setCity(e.target.value)}
            required
          >
            <option value="">Sélectionner…</option>
            {GOUVERNORATS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse complète *</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition"
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
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition bg-white"
            value={productId}
            onChange={e => setProductId(e.target.value)}
            required
          >
            <option value="">Sélectionner un produit…</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.price} DT
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && selectedProduct.variants.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Variante</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition bg-white"
              value={variant}
              onChange={e => setVariant(e.target.value)}
            >
              <option value="">Aucune préférence</option>
              {selectedProduct.variants.map((v, i) => {
                const label = [v.size, v.color].filter(Boolean).join(' / ') || `Variante ${i + 1}`
                return <option key={i} value={label}>{label}</option>
              })}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantité *</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg transition"
            >
              −
            </button>
            <span className="text-lg font-bold text-[#1C1917] w-8 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(q => Math.min(selectedProduct?.stock ?? 99, q + 1))}
              className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold text-lg transition"
            >
              +
            </button>
            {selectedProduct && (
              <span className="text-xs text-gray-400 ml-1">
                {selectedProduct.stock} dispo
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
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition resize-none"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Couleur exacte, taille précise, instructions de livraison…"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#16A34A] hover:bg-green-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-base transition-colors shadow-lg shadow-green-200"
      >
        {loading ? 'Envoi en cours…' : 'Passer la commande'}
      </button>

      <p className="text-xs text-center text-gray-400">
        En passant commande, vous acceptez d&apos;être contacté par le vendeur pour confirmation.
      </p>
    </form>
  )
}
