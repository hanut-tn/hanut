'use client'

import { useState } from 'react'
import { User, Phone, Mail, MapPin, Building2, Home, Landmark, MessageSquare, ArrowLeft } from 'lucide-react'
import { TUNISIAN_GOVERNORATES, isValidTunisianPhone, formatTunisianPhone } from '@/lib/constants'
import { TurnstileWidget, isTurnstileEnabled } from '@/components/ui/TurnstileWidget'
import type { CartItem } from '@/lib/storefront/cart'
import type { StorefrontDict } from '@/lib/i18n/storefront'

export type CheckoutData = {
  name: string
  phone: string
  email: string
  governorate: string
  city: string
  address: string
  landmark: string
  deliveryNotes: string
}

type Props = {
  sellerSlug: string
  cart: CartItem[]
  totalPrice: number
  initialData: CheckoutData | null
  t: StorefrontDict
  onBack: () => void
  onEditCart: () => void
  onSent: (data: CheckoutData) => void
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function CheckoutForm({
  sellerSlug, cart, totalPrice, initialData, t, onBack, onEditCart, onSent,
}: Props) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [phone, setPhone] = useState(initialData?.phone ?? '')
  const [email, setEmail] = useState(initialData?.email ?? '')
  const [governorate, setGovernorate] = useState(initialData?.governorate ?? '')
  const [city, setCity] = useState(initialData?.city ?? '')
  const [address, setAddress] = useState(initialData?.address ?? '')
  const [landmark, setLandmark] = useState(initialData?.landmark ?? '')
  const [deliveryNotes, setDeliveryNotes] = useState(initialData?.deliveryNotes ?? '')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)

  function handlePhoneChange(value: string) {
    const cleaned = formatTunisianPhone(value)
    setPhone(cleaned)
    if (cleaned.length === 8 && !isValidTunisianPhone(cleaned)) {
      setPhoneError(t.errors.phoneInvalidBlur)
    } else {
      setPhoneError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError(t.errors.nameRequired); return }
    if (!isValidTunisianPhone(phone)) { setError(t.errors.phoneInvalidSubmit); return }
    if (!isValidEmail(email)) { setError(t.errors.emailInvalid); return }
    if (!governorate) { setError(t.errors.governorateRequired); return }
    if (!city.trim()) { setError(t.errors.cityRequired); return }
    if (!address.trim()) { setError(t.errors.addressRequired); return }
    if (isTurnstileEnabled() && !turnstileToken) { setError(t.errors.turnstileFailed); return }

    setLoading(true)
    try {
      const res = await fetch('/api/orders/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: sellerSlug,
          email: email.trim().toLowerCase(),
          turnstile_token: turnstileToken || undefined,
        }),
      })
      const data = await res.json()
      setTurnstileToken('')
      setTurnstileResetKey(k => k + 1)
      if (!res.ok) {
        setError(data.error ?? t.errors.sendOtpError)
        return
      }
      onSent({ name, phone, email, governorate, city, address, landmark, deliveryNotes })
    } catch {
      setTurnstileToken('')
      setTurnstileResetKey(k => k + 1)
      setError(t.errors.networkError)
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full border border-gray-200 rounded-xl ps-11 pe-4 py-3 text-base outline-none focus:ring-2 transition focus:border-[var(--primary)] focus:ring-[var(--primary)]/20'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'
  const iconClass = 'absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none'

  return (
    <div className="px-4 py-5 max-w-xl mx-auto space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1C1917] min-h-[40px] touch-manipulation transition-colors"
      >
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t.checkoutExtra.backToShop.replace('← ', '').replace(' ←', '')}
      </button>

      {/* Récapitulatif panier */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-[#1C1917]">{t.checkoutExtra.recapTitle}</p>
          <button type="button" onClick={onEditCart} style={{ color: 'var(--primary)' }} className="text-xs font-medium hover:underline">
            {t.checkoutExtra.editCart}
          </button>
        </div>
        <ul className="space-y-1">
          {cart.map(item => (
            <li key={item.key} className="flex justify-between gap-3 text-sm">
              <span className="text-[#44403C] truncate">
                {item.productName}
                {item.variantLabel && <span className="text-[#78716C]"> · {item.variantLabel}</span>}
                <span className="text-[#78716C]"> × {item.quantity}</span>
              </span>
              <span className="font-semibold text-[#1C1917] shrink-0 tabular-nums">
                {item.productPrice * item.quantity} DT
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2.5 pt-2.5 border-t border-[#E7E5E4] flex justify-between items-center">
          <span className="text-sm text-[#78716C]">{t.cart.total}</span>
          <span className="text-lg font-extrabold" style={{ color: 'var(--primary-dark)' }}>{totalPrice} DT</span>
        </div>
      </div>

      {/* Formulaire client */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <p className="text-base font-bold text-[#1C1917]">{t.checkoutExtra.title}</p>

        <div>
          <label htmlFor="sf-name" className={labelClass}>{t.customer.fullNameLabel}</label>
          <div className="relative">
            <User className={iconClass} />
            <input
              id="sf-name"
              className={inputClass}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.customer.fullNamePlaceholder}
              autoComplete="name"
            />
          </div>
        </div>

        <div>
          <label htmlFor="sf-phone" className={labelClass}>
            {t.customer.phoneLabel}
            <span className="text-[#78716C] font-normal ms-1">{t.customer.phoneDigitsHint}</span>
          </label>
          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 px-3 bg-[#F5F5F4] border border-gray-200 rounded-xl text-base font-medium text-gray-500 shrink-0">
              <Phone className="w-3.5 h-3.5" />
              +216
            </span>
            <input
              id="sf-phone"
              className={`min-w-0 flex-1 border rounded-xl px-4 py-3 text-base outline-none focus:ring-2 transition ${phoneError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-[var(--primary)] focus:ring-[var(--primary)]/20'}`}
              type="tel"
              value={phone}
              onChange={e => handlePhoneChange(e.target.value)}
              onBlur={() => {
                if (phone.length > 0 && !isValidTunisianPhone(phone)) {
                  setPhoneError(t.errors.phoneInvalidBlur)
                }
              }}
              placeholder={t.customer.phonePlaceholder}
              maxLength={8}
              inputMode="numeric"
              autoComplete="tel"
            />
          </div>
          {phoneError && <p className="text-xs text-red-600 mt-1">{phoneError}</p>}
        </div>

        <div>
          <label htmlFor="sf-email" className={labelClass}>{t.customer.emailLabel}</label>
          <div className="relative">
            <Mail className={iconClass} />
            <input
              id="sf-email"
              className={inputClass}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t.customer.emailPlaceholder}
              autoComplete="email"
              inputMode="email"
            />
          </div>
          <p className="text-xs text-[#78716C] mt-1">{t.customer.emailHelper}</p>
        </div>

        <div>
          <label htmlFor="sf-governorate" className={labelClass}>{t.customer.governorateLabel}</label>
          <div className="relative">
            <MapPin className={iconClass} />
            <select
              id="sf-governorate"
              className={`${inputClass} bg-white`}
              value={governorate}
              onChange={e => setGovernorate(e.target.value)}
            >
              <option value="">{t.customer.governoratePlaceholder}</option>
              {TUNISIAN_GOVERNORATES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="sf-city" className={labelClass}>{t.customer.cityLabel}</label>
          <div className="relative">
            <Building2 className={iconClass} />
            <input
              id="sf-city"
              className={inputClass}
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder={t.customer.cityPlaceholder}
              autoComplete="address-level2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="sf-address" className={labelClass}>{t.customer.addressLabel}</label>
          <div className="relative">
            <Home className={iconClass} />
            <input
              id="sf-address"
              className={inputClass}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder={t.customer.addressPlaceholder}
              autoComplete="street-address"
            />
          </div>
        </div>

        <div>
          <label htmlFor="sf-landmark" className={labelClass}>
            {t.customer.landmarkLabel}
            <span className="text-[#78716C] font-normal ms-1">{t.common.optional}</span>
          </label>
          <div className="relative">
            <Landmark className={iconClass} />
            <input
              id="sf-landmark"
              className={inputClass}
              value={landmark}
              onChange={e => setLandmark(e.target.value)}
              placeholder={t.customer.landmarkPlaceholder}
            />
          </div>
        </div>

        <div>
          <label htmlFor="sf-notes" className={labelClass}>
            {t.notes.label}
            <span className="text-[#78716C] font-normal ms-1">{t.common.optional}</span>
          </label>
          <div className="relative">
            <MessageSquare className="absolute start-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            <textarea
              id="sf-notes"
              className={`${inputClass} resize-none`}
              rows={2}
              value={deliveryNotes}
              onChange={e => setDeliveryNotes(e.target.value)}
              placeholder={t.notes.placeholder}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {isTurnstileEnabled() && (
          <div className="flex justify-center">
            <TurnstileWidget onVerify={setTurnstileToken} resetKey={turnstileResetKey} />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (isTurnstileEnabled() && !turnstileToken)}
          style={{ backgroundColor: 'var(--primary)' }}
          className="h-12 w-full touch-manipulation text-white font-bold rounded-lg text-base transition-all duration-150 ease-out active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t.submit.sendingCode : t.submit.orderButton}
        </button>

        <p className="text-xs text-[#78716C] text-center">
          {t.legal.text}{' '}
          <a href="/privacy" className="underline hover:text-[#1C1917]">{t.legal.privacyLink}</a>.
        </p>
      </form>
    </div>
  )
}
