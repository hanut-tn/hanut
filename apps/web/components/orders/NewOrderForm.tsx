'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Product } from '@hanut/types'
import type { CreateOrderInput } from '@/app/(dashboard)/orders/actions'

type CustomerSuggestion = {
  id: string
  name: string
  phone: string
  address?: string | null
  city?: string | null
}

type Props = {
  products: Product[]
  createOrder: (input: CreateOrderInput) => Promise<void>
  initialCustomer?: CustomerSuggestion
}

export default function NewOrderForm({ products, createOrder, initialCustomer }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── Customer section ──
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSuggestion | null>(
    initialCustomer ?? null
  )
  const [customerName, setCustomerName] = useState(initialCustomer?.name ?? '')
  const [phone, setPhone] = useState(initialCustomer?.phone ?? '')
  const [customerAddress, setCustomerAddress] = useState(initialCustomer?.address ?? '')
  const [customerCity, setCustomerCity] = useState(initialCustomer?.city ?? '')

  // Search dropdown
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Product section ──
  const [productId, setProductId] = useState('')
  const [variant, setVariant] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [codAmount, setCodAmount] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selectedProduct = products.find(p => p.id === productId)

  useEffect(() => {
    if (selectedProduct && codAmount === '') setCodAmount(selectedProduct.price * quantity)
  }, [selectedProduct])

  useEffect(() => {
    if (selectedProduct && codAmount !== '') setCodAmount(selectedProduct.price * quantity)
  }, [quantity])

  useEffect(() => { setVariant('') }, [productId])

  function onSearchChange(value: string) {
    setSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (value.length < 2) { setSuggestions([]); setDropdownOpen(false); return }
    setSearching(true)
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(value)}`)
      const data: CustomerSuggestion[] = await res.json()
      setSuggestions(data)
      setDropdownOpen(true)
      setSearching(false)
    }, 300)
  }

  function selectCustomer(c: CustomerSuggestion) {
    setSelectedCustomer(c)
    setCustomerName(c.name)
    setPhone(c.phone)
    setCustomerAddress(c.address ?? '')
    setCustomerCity(c.city ?? '')
    setSearch('')
    setSuggestions([])
    setDropdownOpen(false)
  }

  function clearCustomer() {
    setSelectedCustomer(null)
    setCustomerName('')
    setPhone('')
    setCustomerAddress('')
    setCustomerCity('')
    setSearch('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productId) return setError('Sélectionnez un produit.')
    if (!customerName.trim()) return setError('Entrez le nom du client.')
    if (!phone.trim()) return setError('Entrez le téléphone du client.')
    setError(null)
    startTransition(async () => {
      try {
        await createOrder({
          customer_id: selectedCustomer?.id,
          customer_name: customerName.trim(),
          customer_phone: phone.trim(),
          customer_address: customerAddress.trim() || undefined,
          customer_city: customerCity.trim() || undefined,
          product_id: productId,
          variant: variant || undefined,
          quantity,
          cod_amount: codAmount === '' ? 0 : codAmount,
          notes: notes.trim() || undefined,
        })
        router.push('/orders')
        router.refresh()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
  }

  if (products.length === 0) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle commande</h1>
        <div className="card p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🛍️</p>
          <p className="font-medium text-gray-600">Aucun produit dans votre catalogue</p>
          <p className="text-sm mt-1 mb-5">Ajoutez d&apos;abord un produit avant de créer une commande.</p>
          <a href="/catalog" className="btn-primary inline-block">Aller au catalogue →</a>
        </div>
      </div>
    )
  }

  const initials = selectedCustomer
    ? selectedCustomer.name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
    : ''

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle commande</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── 1. CLIENT ── */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-brand-100 text-brand-700 rounded-full text-xs flex items-center justify-center font-bold">1</span>
            Client
          </h2>

          {/* Selected customer badge OR search input */}
          {selectedCustomer ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{selectedCustomer.name}</p>
                <p className="text-xs text-gray-500 font-mono">{selectedCustomer.phone}</p>
                {selectedCustomer.city && <p className="text-xs text-gray-400">{selectedCustomer.city}</p>}
              </div>
              <button
                type="button"
                onClick={clearCustomer}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1 shrink-0"
                title="Désélectionner ce client"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <input
                  className="input pr-8"
                  placeholder="Rechercher par nom ou téléphone…"
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  onFocus={() => { if (suggestions.length > 0) setDropdownOpen(true) }}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                  autoComplete="off"
                />
                {searching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">…</span>
                )}
              </div>

              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                  {suggestions.length > 0 ? (
                    <>
                      {suggestions.map(c => {
                        const ini = c.name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => selectCustomer(c)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
                          >
                            <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                              {ini}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">{c.name}</p>
                              <p className="text-xs text-gray-400 font-mono">{c.phone}{c.city ? ` · ${c.city}` : ''}</p>
                            </div>
                          </button>
                        )
                      })}
                      <button
                        type="button"
                        onMouseDown={() => { setDropdownOpen(false); setSearch('') }}
                        className="w-full px-4 py-2.5 text-sm text-brand-600 hover:bg-brand-50 transition-colors text-left font-medium border-t border-gray-100"
                      >
                        + Créer un nouveau client
                      </button>
                    </>
                  ) : (
                    search.length >= 2 && !searching && (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        Aucun client trouvé.{' '}
                        <button
                          type="button"
                          onMouseDown={() => { setDropdownOpen(false) }}
                          className="text-brand-600 font-medium hover:underline"
                        >
                          Créer un nouveau client
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fields — always visible, pre-filled when customer selected */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
            <input
              className="input"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+216 XX XXX XXX"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
            <input
              className="input"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Prénom Nom"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                className="input"
                value={customerAddress}
                onChange={e => setCustomerAddress(e.target.value)}
                placeholder="Rue, numéro…"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input
                className="input"
                value={customerCity}
                onChange={e => setCustomerCity(e.target.value)}
                placeholder="Tunis, Sfax…"
              />
            </div>
          </div>
        </div>

        {/* ── 2. PRODUIT ── */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-brand-100 text-brand-700 rounded-full text-xs flex items-center justify-center font-bold">2</span>
            Produit
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produit *</label>
            <select
              className="input"
              value={productId}
              onChange={e => { setProductId(e.target.value); setCodAmount('') }}
              required
            >
              <option value="">Sélectionner un produit…</option>
              {products.map(p => (
                <option key={p.id} value={p.id} disabled={p.stock === 0}>
                  {p.name} — {p.price} DT{p.stock === 0 ? ' (rupture)' : ` (stock: ${p.stock})`}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && selectedProduct.variants.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variante</label>
              <select className="input" value={variant} onChange={e => setVariant(e.target.value)}>
                <option value="">Aucune variante spécifique</option>
                {selectedProduct.variants.map((v, i) => {
                  const label = [v.size, v.color].filter(Boolean).join(' / ') || `Variante ${i + 1}`
                  return (
                    <option key={i} value={label}>
                      {label} (qté: {v.qty})
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantité *</label>
              <input
                className="input"
                type="number"
                min="1"
                max={selectedProduct?.stock ?? 99}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant COD (DT) *</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={codAmount}
                onChange={e => setCodAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0.00"
                required
              />
            </div>
          </div>
        </div>

        {/* ── 3. NOTES ── */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <span className="w-6 h-6 bg-brand-100 text-brand-700 rounded-full text-xs flex items-center justify-center font-bold">3</span>
            Notes <span className="text-sm font-normal text-gray-400">(optionnel)</span>
          </h2>
          <textarea
            className="input resize-none"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Instructions de livraison, couleur exacte, remarques…"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
            Annuler
          </button>
          <button type="submit" disabled={isPending} className="btn-primary flex-1">
            {isPending ? 'Création...' : 'Créer la commande'}
          </button>
        </div>
      </form>
    </div>
  )
}
