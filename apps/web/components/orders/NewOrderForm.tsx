'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, ChevronRight, Package, User, ClipboardList, Plus, Trash2 } from 'lucide-react'
import type { Product } from '@hanut/types'
import type { CreateOrderInput } from '@/app/(dashboard)/orders/actions'
import { TUNISIAN_GOVERNORATES, isValidTunisianPhone } from '@/lib/constants'
import { getVariantLabel, hasVariantStock } from '@/lib/variants'

type CustomerSuggestion = {
  id: string
  name: string
  phone: string
  customer_governorate?: string | null
  customer_city?: string | null
  customer_delegation?: string | null
  customer_address?: string | null
  customer_landmark?: string | null
  customer_postal_code?: string | null
  delivery_notes?: string | null
  address?: string | null
  city?: string | null
}

type CartItem = {
  product_id: string
  variant: string
  quantity: number
  unit_price: number
}

type Props = {
  products: Product[]
  createOrder: (input: CreateOrderInput) => Promise<{ error?: string }>
  initialCustomer?: CustomerSuggestion
}

const STEPS = [
  { label: 'Client',        icon: User },
  { label: 'Articles',      icon: Package },
  { label: 'Récapitulatif', icon: ClipboardList },
]

function emptyCartItem(products: Product[]): CartItem {
  const first = products[0]
  return {
    product_id: first?.id ?? '',
    variant: '',
    quantity: 1,
    unit_price: first?.price ?? 0,
  }
}

export default function NewOrderForm({ products, createOrder, initialCustomer }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(initialCustomer ? 1 : 0)

  // ── Customer ──
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSuggestion | null>(initialCustomer ?? null)
  const [customerName, setCustomerName] = useState(initialCustomer?.name ?? '')
  const [phone, setPhone] = useState(initialCustomer?.phone ?? '')
  const [customerGovernorate, setCustomerGovernorate] = useState(initialCustomer?.customer_governorate ?? initialCustomer?.city ?? '')
  const [customerCity, setCustomerCity] = useState(initialCustomer?.customer_city ?? '')
  const [customerDelegation, setCustomerDelegation] = useState(initialCustomer?.customer_delegation ?? '')
  const [customerAddress, setCustomerAddress] = useState(initialCustomer?.customer_address ?? initialCustomer?.address ?? '')
  const [customerLandmark, setCustomerLandmark] = useState(initialCustomer?.customer_landmark ?? '')
  const [customerPostalCode, setCustomerPostalCode] = useState(initialCustomer?.customer_postal_code ?? '')
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Cart ──
  const [cartItems, setCartItems] = useState<CartItem[]>([emptyCartItem(products)])
  const [codAmountOverride, setCodAmountOverride] = useState<number | ''>('')

  // ── Notes livraison ──
  const [deliveryNotes, setDeliveryNotes] = useState(initialCustomer?.delivery_notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const computedTotal = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const codAmount = codAmountOverride !== '' ? codAmountOverride : computedTotal

  function getProduct(productId: string) {
    return products.find(p => p.id === productId)
  }

  function updateCartItem(index: number, patch: Partial<CartItem>) {
    setCartItems(prev => {
      const next = [...prev]
      const current = next[index]!
      const updated = { ...current, ...patch }
      if (patch.product_id !== undefined && patch.product_id !== current.product_id) {
        const newProduct = getProduct(patch.product_id)
        updated.variant = ''
        updated.quantity = 1
        updated.unit_price = newProduct?.price ?? 0
      }
      if (patch.variant !== undefined && patch.variant !== current.variant) {
        updated.quantity = 1
      }
      next[index] = updated
      return next
    })
    if (patch.unit_price === undefined) setCodAmountOverride('')
  }

  function addCartItem() {
    setCartItems(prev => [...prev, emptyCartItem(products)])
    setCodAmountOverride('')
  }

  function removeCartItem(index: number) {
    if (cartItems.length <= 1) return
    setCartItems(prev => prev.filter((_, i) => i !== index))
    setCodAmountOverride('')
  }

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
    setCustomerGovernorate(c.customer_governorate ?? c.city ?? '')
    setCustomerCity(c.customer_city ?? '')
    setCustomerDelegation(c.customer_delegation ?? '')
    setCustomerAddress(c.customer_address ?? c.address ?? '')
    setCustomerLandmark(c.customer_landmark ?? '')
    setCustomerPostalCode(c.customer_postal_code ?? '')
    setDeliveryNotes(c.delivery_notes ?? '')
    setSearch('')
    setSuggestions([])
    setDropdownOpen(false)
  }

  function clearCustomer() {
    setSelectedCustomer(null)
    setCustomerName('')
    setPhone('')
    setCustomerGovernorate('')
    setCustomerCity('')
    setCustomerDelegation('')
    setCustomerAddress('')
    setCustomerLandmark('')
    setCustomerPostalCode('')
    setDeliveryNotes('')
    setSearch('')
  }

  function goToStep(n: number) {
    setError(null)
    if (n === 1) {
      if (!phone.trim()) return setError('Le téléphone est obligatoire.')
      if (!isValidTunisianPhone(phone)) return setError('Numéro tunisien invalide. Ex: 22 123 456')
      if (!customerName.trim()) return setError('Le nom du client est obligatoire.')
      if (!customerGovernorate) return setError('Le gouvernorat est obligatoire.')
      if (!customerCity.trim()) return setError('La ville / délégation est obligatoire.')
      if (!customerAddress.trim()) return setError("L'adresse détaillée est obligatoire.")
      if (!customerLandmark.trim()) return setError('Le repère livreur est obligatoire.')
      if (customerPostalCode.trim() && !/^\d{4}$/.test(customerPostalCode.trim())) {
        return setError('Le code postal doit contenir 4 chiffres.')
      }
    }
    if (n === 2) {
      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i]!
        const product = getProduct(item.product_id)
        if (!item.product_id) return setError(`Article ${i + 1} : sélectionnez un produit.`)
        const hasVariants = (product?.variants.length ?? 0) > 0
        if (hasVariants && !item.variant) return setError(`Article ${i + 1} : sélectionnez une variante.`)
        const selectedVariant = hasVariants
          ? product?.variants.find((v, idx) => getVariantLabel(v, idx) === item.variant)
          : undefined
        const maxQty = selectedVariant ? selectedVariant.qty : (product?.stock ?? 0)
        if (item.quantity < 1 || item.quantity > maxQty) {
          return setError(`Article ${i + 1} : stock disponible : ${maxQty} unité(s).`)
        }
      }
    }
    setStep(n)
  }

  function handleSubmit() {
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i]!
      const product = getProduct(item.product_id)
      if (!item.product_id) { setError(`Article ${i + 1} : sélectionnez un produit.`); setStep(1); return }
      const hasVariants = (product?.variants.length ?? 0) > 0
      if (hasVariants && !item.variant) { setError(`Article ${i + 1} : sélectionnez une variante.`); setStep(1); return }
      const selectedVariant = hasVariants
        ? product?.variants.find((v, idx) => getVariantLabel(v, idx) === item.variant)
        : undefined
      const maxQty = selectedVariant ? selectedVariant.qty : (product?.stock ?? 0)
      if (item.quantity < 1 || item.quantity > maxQty) {
        setError(`Article ${i + 1} : stock disponible : ${maxQty} unité(s).`)
        setStep(1)
        return
      }
    }
    if (!customerName.trim()) { setError('Le nom du client est obligatoire.'); setStep(0); return }
    if (!phone.trim()) { setError('Le téléphone est obligatoire.'); setStep(0); return }
    if (!isValidTunisianPhone(phone)) { setError('Numéro tunisien invalide. Ex: 22 123 456'); setStep(0); return }
    if (!customerGovernorate) { setError('Le gouvernorat est obligatoire.'); setStep(0); return }
    if (!customerCity.trim()) { setError('La ville / délégation est obligatoire.'); setStep(0); return }
    if (!customerAddress.trim()) { setError("L'adresse détaillée est obligatoire."); setStep(0); return }
    if (!customerLandmark.trim()) { setError('Le repère livreur est obligatoire.'); setStep(0); return }
    if (customerPostalCode.trim() && !/^\d{4}$/.test(customerPostalCode.trim())) {
      setError('Le code postal doit contenir 4 chiffres.'); setStep(0); return
    }
    setError(null)
    startTransition(async () => {
      try {
        const firstItem = cartItems[0]!
        const result = await createOrder({
          customer_id: selectedCustomer?.id,
          customer_name: customerName.trim(),
          customer_phone: phone.trim(),
          customer_governorate: customerGovernorate,
          customer_city: customerCity.trim(),
          customer_delegation: customerDelegation.trim() || undefined,
          customer_address: customerAddress.trim(),
          customer_landmark: customerLandmark.trim(),
          customer_postal_code: customerPostalCode.trim() || undefined,
          delivery_notes: deliveryNotes.trim() || undefined,
          product_id: firstItem.product_id,
          variant: firstItem.variant || undefined,
          quantity: firstItem.quantity,
          cod_amount: codAmount,
          items: cartItems.map(item => ({
            product_id: item.product_id,
            variant: item.variant || undefined,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        })
        if (result?.error === 'LIMIT_REACHED') {
          setError('Limite de 100 commandes atteinte ce mois. Passe au plan Pro pour des commandes illimitées.')
          setStep(0)
          return
        }
        if (result?.error) {
          setError(result.error)
          setStep(0)
          return
        }
        router.push('/orders')
        router.refresh()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
        setStep(0)
      }
    })
  }

  if (products.length === 0) {
    return (
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[#1C1917]">Nouvelle commande</h1>
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-8 text-center sm:p-12">
          <Package className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-40" />
          <p className="font-medium text-[#1C1917]">Aucun produit dans votre catalogue</p>
          <p className="text-sm text-[#78716C] mt-1 mb-5">Ajoutez d&apos;abord un produit avant de créer une commande.</p>
          <Link href="/catalog" className="btn-primary inline-block">Aller au catalogue →</Link>
        </div>
      </div>
    )
  }

  const ini = selectedCustomer
    ? selectedCustomer.name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
    : ''

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F4] text-[#78716C] hover:text-[#1C1917] transition-colors"
        >
          ←
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1C1917]">Nouvelle commande</h1>
      </div>

      {/* Progress steps */}
      <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm px-4 py-4 sm:px-6">
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const done = i < step
            const active = i === step
            const Icon = s.icon
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => { if (done) setStep(i) }}
                  disabled={!done}
                  className="flex items-center gap-2 shrink-0"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    done
                      ? 'bg-[#16A34A] text-white'
                      : active
                        ? 'bg-[#F0FDF4] text-[#16A34A] border-2 border-[#16A34A]'
                        : 'bg-[#F5F5F4] text-[#A8A29E]'
                  }`}>
                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${
                    done ? 'text-[#16A34A]' : active ? 'text-[#1C1917]' : 'text-[#A8A29E]'
                  }`}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-[#16A34A]' : 'bg-[#E7E5E4]'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* STEP 0 — Client */}
      {step === 0 && (
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-4 space-y-4 sm:p-6">
          <h2 className="font-semibold text-[#1C1917] flex items-center gap-2">
            <span className="w-6 h-6 bg-[#F0FDF4] text-[#166534] rounded-full text-xs flex items-center justify-center font-bold">1</span>
            Client
          </h2>

          {selectedCustomer ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-8 h-8 bg-[#F0FDF4] text-[#166534] rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none">
                {ini}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#1C1917]">{selectedCustomer.name}</p>
                <p className="text-xs text-[#78716C] font-mono">{selectedCustomer.phone}</p>
                {(selectedCustomer.customer_governorate ?? selectedCustomer.city) && (
                  <p className="text-xs text-[#78716C]">{selectedCustomer.customer_governorate ?? selectedCustomer.city}</p>
                )}
              </div>
              <button
                type="button"
                onClick={clearCustomer}
                className="text-[#78716C] hover:text-[#1C1917] text-lg leading-none px-1 shrink-0"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                className="input pr-8"
                placeholder="Rechercher un client existant…"
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setDropdownOpen(true) }}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                autoComplete="off"
              />
              {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#78716C]">…</span>}
              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-[#E7E5E4] z-50 overflow-hidden">
                  {suggestions.length > 0 ? (
                    <>
                      {suggestions.map(c => {
                        const cIni = c.name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => selectCustomer(c)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF9] transition-colors text-left border-b border-[#E7E5E4] last:border-0"
                          >
                            <div className="w-8 h-8 bg-[#F0FDF4] text-[#166534] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                              {cIni}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-[#1C1917] truncate">{c.name}</p>
                              <p className="text-xs text-[#78716C] font-mono">
                                {c.phone}{(c.customer_governorate ?? c.city) ? ` · ${c.customer_governorate ?? c.city}` : ''}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                      <button
                        type="button"
                        onMouseDown={() => { setDropdownOpen(false); setSearch('') }}
                        className="w-full px-4 py-2.5 text-sm text-[#16A34A] hover:bg-[#F0FDF4] transition-colors text-left font-medium border-t border-[#E7E5E4]"
                      >
                        + Créer un nouveau client
                      </button>
                    </>
                  ) : search.length >= 2 && !searching && (
                    <div className="px-4 py-3 text-sm text-[#78716C]">
                      Aucun client trouvé.{' '}
                      <button type="button" onMouseDown={() => setDropdownOpen(false)} className="text-[#16A34A] font-medium hover:underline">
                        Saisir manuellement
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">Téléphone <span className="text-red-500">*</span></label>
            <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+216 XX XXX XXX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">Nom complet <span className="text-red-500">*</span></label>
            <input className="input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Prénom Nom" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Gouvernorat <span className="text-red-500">*</span></label>
              <select className="input bg-white" value={customerGovernorate} onChange={e => setCustomerGovernorate(e.target.value)}>
                <option value="">Sélectionner…</option>
                {TUNISIAN_GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Ville / Délégation <span className="text-red-500">*</span></label>
              <input className="input" value={customerCity} onChange={e => setCustomerCity(e.target.value)} placeholder="Sfax, Sakiet Ezzit…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Adresse détaillée <span className="text-red-500">*</span></label>
              <input className="input" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Rue, numéro, quartier…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Repère livreur <span className="text-red-500">*</span></label>
              <input className="input" value={customerLandmark} onChange={e => setCustomerLandmark(e.target.value)} placeholder="Près de la mosquée…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Code postal <span className="text-xs font-normal text-[#78716C]">(optionnel)</span></label>
              <input className="input" inputMode="numeric" maxLength={4} value={customerPostalCode} onChange={e => setCustomerPostalCode(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="3000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Délégation précise <span className="text-xs font-normal text-[#78716C]">(optionnel)</span></label>
              <input className="input" value={customerDelegation} onChange={e => setCustomerDelegation(e.target.value)} placeholder="Si différente…" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={() => goToStep(1)} className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto">
              Articles
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 1 — Articles */}
      {step === 1 && (
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-4 space-y-4 sm:p-6">
          <h2 className="font-semibold text-[#1C1917] flex items-center gap-2">
            <span className="w-6 h-6 bg-[#F0FDF4] text-[#166534] rounded-full text-xs flex items-center justify-center font-bold">2</span>
            Articles
          </h2>

          <div className="space-y-4">
            {cartItems.map((item, index) => {
              const product = getProduct(item.product_id)
              const hasVariants = (product?.variants.length ?? 0) > 0
              const selectedVariant = hasVariants
                ? product?.variants.find((v, i) => getVariantLabel(v, i) === item.variant)
                : undefined
              const maxQty = selectedVariant ? selectedVariant.qty : (product?.stock ?? 99)

              return (
                <div key={index} className="border border-[#E7E5E4] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#78716C]">Article {index + 1}</p>
                    {cartItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCartItem(index)}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1">Produit <span className="text-red-500">*</span></label>
                    <select
                      className="input bg-white"
                      value={item.product_id}
                      onChange={e => updateCartItem(index, { product_id: e.target.value })}
                    >
                      <option value="">Sélectionner un produit…</option>
                      {products.map(p => {
                        const available = p.variants.length > 0 ? hasVariantStock(p.variants) : p.stock > 0
                        return (
                          <option key={p.id} value={p.id} disabled={!available}>
                            {p.name} — {p.price} DT{!available ? ' (rupture)' : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {hasVariants && product && (
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1">Variante <span className="text-red-500">*</span></label>
                      <div className="flex flex-wrap gap-2">
                        {product.variants.map((v, i) => {
                          const label = getVariantLabel(v, i)
                          const out = v.qty <= 0
                          return (
                            <button
                              key={i}
                              type="button"
                              disabled={out}
                              onClick={() => updateCartItem(index, { variant: label, unit_price: product.price })}
                              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                                out
                                  ? 'border-[#E7E5E4] text-[#A8A29E] opacity-50 line-through cursor-not-allowed'
                                  : item.variant === label
                                    ? 'bg-[#16A34A] text-white border-[#16A34A]'
                                    : 'border-[#E7E5E4] text-[#78716C] hover:border-[#D6D3D1]'
                              }`}
                            >
                              {label} <span className="text-xs opacity-70">({v.qty})</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1">Quantité <span className="text-red-500">*</span></label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        max={maxQty}
                        value={item.quantity}
                        onChange={e => updateCartItem(index, { quantity: Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1C1917] mb-1">Prix unitaire (DT)</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={e => {
                          updateCartItem(index, { unit_price: parseFloat(e.target.value) || 0 })
                          setCodAmountOverride('')
                        }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {product && (
                    <p className="text-xs text-[#78716C]">
                      Sous-total : <span className="font-semibold text-[#1C1917]">{(item.unit_price * item.quantity).toFixed(2)} DT</span>
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={addCartItem}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-[#D6D3D1] rounded-xl text-sm text-[#78716C] hover:border-[#16A34A] hover:text-[#16A34A] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter un article
          </button>

          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">
              Montant COD total (DT) <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={codAmountOverride !== '' ? codAmountOverride : Number(computedTotal.toFixed(2))}
              onChange={e => setCodAmountOverride(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="0.00"
            />
            {codAmountOverride === '' && cartItems.length > 1 && (
              <p className="text-xs text-[#78716C] mt-1">Calculé automatiquement depuis les articles. Modifiable.</p>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button onClick={() => setStep(0)} className="btn-secondary flex-1">Retour</button>
            <button onClick={() => goToStep(2)} className="btn-primary flex-1 flex items-center justify-center gap-2">
              Récapitulatif
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Récapitulatif */}
      {step === 2 && (
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-4 space-y-5 sm:p-6">
          <h2 className="font-semibold text-[#1C1917] flex items-center gap-2">
            <span className="w-6 h-6 bg-[#F0FDF4] text-[#166534] rounded-full text-xs flex items-center justify-center font-bold">3</span>
            Récapitulatif
          </h2>

          {/* Client summary */}
          <div className="bg-[#F0FDF4] border border-green-200 rounded-xl p-4 space-y-1">
            <p className="text-xs font-medium text-[#78716C] uppercase tracking-wide">Client</p>
            <p className="font-semibold text-[#1C1917]">{customerName}</p>
            <p className="text-sm text-[#78716C]">{phone}</p>
            <p className="text-sm text-[#78716C]">
              {[customerAddress, customerLandmark, customerCity, customerGovernorate].filter(Boolean).join(', ')}
            </p>
          </div>

          {/* Articles summary */}
          <div className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-[#78716C] uppercase tracking-wide">Articles</p>
            <table className="w-full text-sm">
              <tbody>
                {cartItems.map((item, index) => {
                  const product = getProduct(item.product_id)
                  return (
                    <tr key={index} className="border-b border-[#F5F5F4] last:border-0">
                      <td className="py-1.5 pr-2">
                        <span className="font-medium text-[#1C1917]">{product?.name ?? '—'}</span>
                        {item.variant && <span className="text-[#78716C] ml-1">· {item.variant}</span>}
                      </td>
                      <td className="py-1.5 text-center text-[#78716C] px-2">× {item.quantity}</td>
                      <td className="py-1.5 text-right font-medium text-[#1C1917]">
                        {(item.unit_price * item.quantity).toFixed(2)} DT
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#E7E5E4]">
                  <td colSpan={2} className="pt-2 text-right text-sm font-medium text-[#1C1917]">Total COD</td>
                  <td className="pt-2 text-right text-xl font-bold text-[#16A34A]">{codAmount} DT</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">
              Notes de livraison <span className="text-xs font-normal text-[#78716C]">(optionnel)</span>
            </label>
            <textarea
              className="input resize-none"
              rows={3}
              value={deliveryNotes}
              onChange={e => setDeliveryNotes(e.target.value)}
              placeholder="Appeler avant livraison, créneau préféré…"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1">Retour</button>
            <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex-1">
              {isPending ? 'Création...' : 'Créer la commande'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
