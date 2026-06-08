'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Check, ChevronRight, Package, User, ClipboardList } from 'lucide-react'
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

const STEPS = [
  { label: 'Client',       icon: User },
  { label: 'Produit',      icon: Package },
  { label: 'Récapitulatif',icon: ClipboardList },
]

export default function NewOrderForm({ products, createOrder, initialCustomer }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(initialCustomer ? 1 : 0)

  // ── Customer ──
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSuggestion | null>(initialCustomer ?? null)
  const [customerName, setCustomerName] = useState(initialCustomer?.name ?? '')
  const [phone, setPhone] = useState(initialCustomer?.phone ?? '')
  const [customerAddress, setCustomerAddress] = useState(initialCustomer?.address ?? '')
  const [customerCity, setCustomerCity] = useState(initialCustomer?.city ?? '')
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Product ──
  const [productId, setProductId] = useState('')
  const [variant, setVariant] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [codAmount, setCodAmount] = useState<number | ''>('')
  const [productSearch, setProductSearch] = useState('')

  // ── Notes ──
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selectedProduct = products.find(p => p.id === productId)

  const filteredProducts = productSearch
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : products

  useEffect(() => {
    if (selectedProduct) setCodAmount(selectedProduct.price * quantity)
  }, [selectedProduct, quantity])

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

  function goToStep(n: number) {
    setError(null)
    if (n === 1) {
      if (!phone.trim()) return setError('Le téléphone est obligatoire.')
      if (!customerName.trim()) return setError('Le nom du client est obligatoire.')
    }
    if (n === 2) {
      if (!productId) return setError('Sélectionnez un produit.')
    }
    setStep(n)
  }

  function handleSubmit() {
    if (!productId) return setError('Sélectionnez un produit.')
    if (!customerName.trim()) return setError('Le nom du client est obligatoire.')
    if (!phone.trim()) return setError('Le téléphone est obligatoire.')
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

          {/* Selected customer badge */}
          {selectedCustomer ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-8 h-8 bg-[#F0FDF4] text-[#166534] rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none">
                {ini}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#1C1917]">{selectedCustomer.name}</p>
                <p className="text-xs text-[#78716C] font-mono">{selectedCustomer.phone}</p>
                {selectedCustomer.city && <p className="text-xs text-[#78716C]">{selectedCustomer.city}</p>}
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
                              <p className="text-xs text-[#78716C] font-mono">{c.phone}{c.city ? ` · ${c.city}` : ''}</p>
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
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Adresse</label>
              <input className="input" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Rue, numéro…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Ville</label>
              <input className="input" value={customerCity} onChange={e => setCustomerCity(e.target.value)} placeholder="Tunis, Sfax…" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={() => goToStep(1)} className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto">
              Produit
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 1 — Produit */}
      {step === 1 && (
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-4 space-y-4 sm:p-6">
          <h2 className="font-semibold text-[#1C1917] flex items-center gap-2">
            <span className="w-6 h-6 bg-[#F0FDF4] text-[#166534] rounded-full text-xs flex items-center justify-center font-bold">2</span>
            Produit
          </h2>

          <div>
            <input
              className="input"
              placeholder="Rechercher un produit…"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1 sm:grid-cols-3">
            {filteredProducts.map(p => (
              <button
                key={p.id}
                type="button"
                disabled={p.stock === 0}
                onClick={() => { setProductId(p.id); setCodAmount('') }}
                className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                  productId === p.id
                    ? 'border-[#16A34A] bg-green-50'
                    : p.stock === 0
                      ? 'border-[#E7E5E4] opacity-50 cursor-not-allowed'
                      : 'border-[#E7E5E4] hover:border-[#D6D3D1] hover:bg-[#FAFAF9]'
                }`}
              >
                {p.image_url ? (
                  <div className="relative w-full aspect-square rounded-lg mb-2 overflow-hidden">
                    <Image
                      src={p.image_url}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k="
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-[#F5F5F4] rounded-lg mb-2 flex items-center justify-center">
                    <Package className="w-6 h-6 text-[#A8A29E]" />
                  </div>
                )}
                <p className="text-xs font-semibold text-[#1C1917] truncate">{p.name}</p>
                <p className="text-xs text-[#16A34A] font-medium">{p.price} DT</p>
                {p.stock === 0 && <p className="text-xs text-red-500">Rupture</p>}
                {productId === p.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-[#16A34A] rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {selectedProduct && selectedProduct.variants.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Variante</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setVariant('')}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    !variant ? 'bg-[#16A34A] text-white border-[#16A34A]' : 'border-[#E7E5E4] text-[#78716C] hover:border-[#D6D3D1]'
                  }`}
                >
                  Aucune
                </button>
                {selectedProduct.variants.map((v, i) => {
                  const label = [v.size, v.color].filter(Boolean).join(' / ') || `Variante ${i + 1}`
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setVariant(label)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        variant === label ? 'bg-[#16A34A] text-white border-[#16A34A]' : 'border-[#E7E5E4] text-[#78716C] hover:border-[#D6D3D1]'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Quantité <span className="text-red-500">*</span></label>
              <input
                className="input"
                type="number"
                min="1"
                max={selectedProduct?.stock ?? 99}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Montant COD (DT) <span className="text-red-500">*</span></label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={codAmount}
                onChange={e => setCodAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0.00"
              />
            </div>
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
            {customerCity && <p className="text-sm text-[#78716C]">{customerCity}</p>}
          </div>

          {/* Product summary */}
          <div className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl p-4 space-y-1">
            <p className="text-xs font-medium text-[#78716C] uppercase tracking-wide">Produit</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-[#1C1917]">{selectedProduct?.name ?? '—'}</p>
                {variant && <p className="text-sm text-[#78716C]">{variant}</p>}
                {quantity > 1 && <p className="text-sm text-[#78716C]">× {quantity}</p>}
              </div>
              <p className="shrink-0 text-xl font-bold text-[#16A34A]">{codAmount === '' ? '0' : codAmount} DT</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#1C1917] mb-1">
              Notes <span className="text-xs font-normal text-[#78716C]">(optionnel)</span>
            </label>
            <textarea
              className="input resize-none"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Instructions de livraison, couleur exacte, remarques…"
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
