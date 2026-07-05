'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import type { Product } from '@hanut/types'
import {
  PackageX, Package, Copy, ExternalLink, User, Phone, Mail, MapPin, Building2,
  Home, Landmark, Hash, MessageSquare, Wallet, ShoppingBag, CheckCircle2,
} from 'lucide-react'
import { TUNISIAN_GOVERNORATES, isValidTunisianPhone, formatTunisianPhone } from '@/lib/constants'
import { getVariantLabel, getVariantPrice } from '@/lib/variants'
import { TurnstileWidget, isTurnstileEnabled } from '@/components/ui/TurnstileWidget'
import { useLang } from '@/lib/i18n/use-lang'
import { orderFormTranslations } from '@/lib/i18n/order-form'

type Props = {
  sellerSlug: string
  sellerName: string
  products: Product[]
}

type Submitted = { orderId: string; trackingToken: string }
type StockErrorScope = 'product' | 'variant'

function getVariantKey(productId: string, label: string) {
  return `${productId}::${label}`
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function OrderForm({ sellerSlug, sellerName, products: initialProducts }: Props) {
  const formTopRef = useRef<HTMLFormElement>(null)
  const { t, isRtl, toggleLang } = useLang(orderFormTranslations)

  // ── Form state ────────────────────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [governorate, setGovernorate] = useState('')
  const [customerCity, setCustomerCity] = useState('')
  const [delegation, setDelegation] = useState('')
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [productId, setProductId] = useState('')
  const [variant, setVariant] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [variantQtys, setVariantQtys] = useState<Record<string, number>>({})
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [stockError, setStockError] = useState<string | null>(null)
  const [stockErrorScope, setStockErrorScope] = useState<StockErrorScope>('product')
  const [exhaustedIds, setExhaustedIds] = useState<Set<string>>(new Set())
  const [exhaustedVariantKeys, setExhaustedVariantKeys] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState<Submitted | null>(null)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)

  // ── OTP state ─────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [otpDigits, setOtpDigits] = useState(['', '', '', ''])
  const [otpError, setOtpError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpRef0 = useRef<HTMLInputElement>(null)
  const otpRef1 = useRef<HTMLInputElement>(null)
  const otpRef2 = useRef<HTMLInputElement>(null)
  const otpRef3 = useRef<HTMLInputElement>(null)
  const otpRefs = [otpRef0, otpRef1, otpRef2, otpRef3]
  const otpSubmittingRef = useRef(false)

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

  const multiVariantQtyTotal = Object.values(variantQtys).reduce((s, q) => s + (q || 0), 0)

  // Reset variant + quantity when product changes
  useEffect(() => {
    setVariant('')
    setQuantity(1)
    setVariantQtys({})
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

  // Resend OTP countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  function handlePhoneChange(value: string) {
    const cleaned = formatTunisianPhone(value)
    setPhone(cleaned)
    if (cleaned.length === 8 && !isValidTunisianPhone(cleaned)) {
      setPhoneError(t.errors.phoneInvalidBlur)
    } else {
      setPhoneError(null)
    }
  }

  function buildItems() {
    if (!selectedProduct) return null
    if (hasVariants && selectedProduct.variants.length > 1) {
      const items = selectedProduct.variants
        .map((v, i) => {
          const label = getVariantLabel(v, i)
          const qty = variantQtys[label] ?? 0
          return qty > 0 ? { product_id: selectedProduct.id, variant: label, quantity: qty } : null
        })
        .filter(Boolean)
      return items.length > 0 ? items : null
    }
    return null
  }

  // ── Step 1 : envoyer l'OTP ────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEmailError(null)
    setStockError(null)

    if (!isValidTunisianPhone(phone)) {
      setError(t.errors.phoneInvalidSubmit)
      return
    }
    if (!name.trim()) {
      setError(t.errors.nameRequired)
      return
    }
    if (!isValidEmail(email)) {
      setEmailError(t.errors.emailInvalid)
      return
    }
    if (!governorate) {
      setError(t.errors.governorateRequired)
      return
    }
    if (!customerCity.trim()) {
      setError(t.errors.cityRequired)
      return
    }
    if (!address.trim()) {
      setError(t.errors.addressRequired)
      return
    }

    if (postalCode.trim() && !/^\d{4}$/.test(postalCode.trim())) {
      setError(t.errors.postalCodeInvalid)
      return
    }
    if (!productId) {
      setError(t.errors.productRequired)
      return
    }
    if (hasVariants && selectedProduct && selectedProduct.variants.length > 1) {
      if (multiVariantQtyTotal === 0) {
        setError(t.errors.variantQtyRequired)
        return
      }
    } else {
      if (hasVariants && !variant) {
        setError(t.errors.variantRequired)
        return
      }
      if (selectedProduct && quantity > maxQty) {
        setError(t.errors.stockAvailableError(maxQty))
        return
      }
    }
    if (isTurnstileEnabled() && !turnstileToken) {
      setError(t.errors.turnstileFailed)
      return
    }

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
      setOtpDigits(['', '', '', ''])
      setOtpError(null)
      setStep('otp')
      setResendCooldown(60)
      setTimeout(() => otpRef0.current?.focus(), 100)
    } catch {
      setTurnstileToken('')
      setTurnstileResetKey(k => k + 1)
      setError(t.errors.networkError)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2 : vérifier l'OTP et créer la commande ─────────────────────────────
  async function handleOtpSubmit(code: string) {
    if (loading || otpSubmittingRef.current) return
    if (code.length !== 4) {
      setOtpError(t.otp.otpEmpty)
      return
    }
    if (isTurnstileEnabled() && !turnstileToken) {
      setOtpError(t.otp.otpTurnstilePending)
      return
    }
    otpSubmittingRef.current = true
    setOtpError(null)
    setLoading(true)
    try {
      const phoneDigits = phone.replace(/\D/g, '')
      const multiItems = buildItems()
      const body: Record<string, unknown> = {
        slug: sellerSlug,
        email: email.trim().toLowerCase(),
        code,
        customer_name: name.trim(),
        customer_phone: phoneDigits,
        customer_governorate: governorate,
        customer_city: customerCity.trim(),
        customer_delegation: delegation.trim() || undefined,
        customer_address: address.trim(),
        customer_landmark: landmark.trim() || undefined,
        customer_postal_code: postalCode.trim() || undefined,
        delivery_notes: deliveryNotes.trim() || undefined,
        turnstile_token: turnstileToken || undefined,
      }
      if (multiItems) {
        body.items = multiItems
      } else {
        body.product_id = productId
        body.variant = variant || undefined
        body.quantity = quantity
      }
      const res = await fetch('/api/orders/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setTurnstileToken('')
      setTurnstileResetKey(k => k + 1)
      if (!res.ok) {
        const msg: string = data.error ?? t.otp.otpInvalid
        const isStockError =
          msg.toLowerCase().includes('insuffisant') || msg.toLowerCase().includes('stock')
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
            if (!hasOtherAvailableVariant) setExhaustedIds(prev => new Set([...prev, productId]))
            setVariant('')
            setQuantity(1)
          } else {
            setStockErrorScope('product')
            setExhaustedIds(prev => new Set([...prev, productId]))
          }
          setStep('form')
        } else {
          setOtpError(msg)
          setOtpDigits(['', '', '', ''])
          setTimeout(() => otpRef0.current?.focus(), 100)
        }
        return
      }
      setSubmitted({
        orderId: data.order_id as string,
        trackingToken: data.tracking_token as string,
      })
    } catch {
      setTurnstileToken('')
      setTurnstileResetKey(k => k + 1)
      setOtpError(t.otp.otpNetworkError)
      setOtpDigits(['', '', '', ''])
    } finally {
      otpSubmittingRef.current = false
      setLoading(false)
    }
  }

  async function handleResendOtp() {
    if (loading) return
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
      setTurnstileToken('')
      setTurnstileResetKey(k => k + 1)
      if (res.ok) {
        setOtpDigits(['', '', '', ''])
        setOtpError(null)
        setResendCooldown(60)
        setTimeout(() => otpRef0.current?.focus(), 100)
      } else {
        const data = await res.json()
        setOtpError(data.error ?? t.otp.otpSendError)
      }
    } catch {
      setTurnstileToken('')
      setTurnstileResetKey(k => k + 1)
      setOtpError(t.otp.otpNetworkError)
    } finally {
      setLoading(false)
    }
  }

  function handleOtpDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...otpDigits]
    newDigits[index] = digit
    setOtpDigits(newDigits)
    if (digit) {
      if (index < 3) {
        otpRefs[index + 1].current?.focus()
      } else if (newDigits.every(d => d !== '')) {
        handleOtpSubmit(newDigits.join(''))
      }
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const newDigits = [...otpDigits]
      newDigits[index - 1] = ''
      setOtpDigits(newDigits)
      otpRefs[index - 1].current?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (digits.length === 4) {
      setOtpDigits(digits.split(''))
      handleOtpSubmit(digits)
    } else if (digits.length > 0) {
      const newDigits = ['', '', '', '']
      for (let i = 0; i < digits.length; i++) newDigits[i] = digits[i]
      setOtpDigits(newDigits)
      otpRefs[Math.min(digits.length, 3)].current?.focus()
    }
  }

  const langToggleButton = (
    <div className="flex justify-end mb-3">
      <button
        type="button"
        onClick={toggleLang}
        className="text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-full px-3.5 py-1.5 min-h-[36px] shadow-sm touch-manipulation transition-all duration-150 ease-out hover:bg-gray-50 hover:text-[#1C1917] hover:scale-[1.03] active:scale-[0.97]"
      >
        {t.common.langToggle}
      </button>
    </div>
  )

  let inner: React.ReactNode

  // ── Confirmation screen ───────────────────────────────────────────────────────
  if (submitted) {
    const trackUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/track/${submitted.trackingToken}`

    inner = (
      <div className="flex flex-col items-center text-center py-10 space-y-5">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center ring-8 ring-green-50/60">
          <CheckCircle2 className="w-10 h-10 text-[#16A34A]" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]">{t.success.title}</h2>
          <p className="text-gray-500 mt-2 max-w-sm">
            {t.success.description(sellerName)}
          </p>
        </div>

        <div className="bg-[#F5F5F4] rounded-xl px-6 py-4 border-2 border-dashed border-[#D6D3D1]">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t.success.orderNumberLabel}</p>
          <p className="text-xl font-bold text-[#0B5E46] tracking-wider font-mono">#{submitted.orderId}</p>
        </div>

        <div className="w-full bg-white border border-[#E7E5E4] rounded-2xl p-4 space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-[#1C1917]">{t.success.trackMyOrderTitle}</p>
          <a
            href={trackUrl}
            className="flex items-center justify-center gap-2 min-h-[44px] w-full bg-[#16A34A] text-white font-semibold rounded-lg text-sm transition-all duration-150 ease-out hover:bg-[#15803D] hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-[#16A34A]/40 active:scale-[0.97] touch-manipulation"
          >
            <ExternalLink className="w-4 h-4" />
            {t.success.viewOrderStatus}
          </a>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(trackUrl).catch(() => {})
            }}
            className="flex items-center justify-center gap-2 min-h-[44px] w-full border border-[#16A34A] text-[#16A34A] rounded-lg text-sm transition-all duration-150 ease-out hover:bg-green-50 hover:border-[#15803D] hover:text-[#15803D] hover:scale-[1.03] active:scale-[0.97] touch-manipulation"
          >
            <Copy className="w-4 h-4" />
            {t.success.copyTrackingLink}
          </button>
        </div>

        <button
          onClick={() => {
            setSubmitted(null)
            setName(''); setPhone(''); setEmail('')
            setGovernorate(''); setCustomerCity(''); setDelegation('')
            setAddress(''); setLandmark(''); setPostalCode('')
            setProductId(''); setVariant(''); setQuantity(1); setVariantQtys({}); setDeliveryNotes('')
            setTurnstileToken(''); setTurnstileResetKey(k => k + 1)
            setStep('form')
          }}
          className="min-h-[44px] touch-manipulation text-sm font-medium text-[#16A34A] transition-all duration-150 ease-out hover:scale-[1.03] hover:text-[#15803D] hover:underline active:scale-[0.97]"
        >
          {t.success.placeAnotherOrder}
        </button>
      </div>
    )
  } else if (step === 'otp') {
    // ── OTP screen ────────────────────────────────────────────────────────────────
    inner = (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#1C1917]">{t.otp.title}</h2>
          <p className="text-sm text-gray-500 mt-1.5">
            {t.otp.sentTo}
          </p>
          <p className="text-sm font-semibold text-[#1C1917] mt-0.5 break-all">{email}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
          <div className="flex gap-3 justify-center" onPaste={handleOtpPaste}>
            {otpRefs.map((ref, i) => (
              <input
                key={i}
                ref={ref}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={1}
                value={otpDigits[i]}
                onChange={e => handleOtpDigit(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={t.otp.digitAriaLabel(i + 1)}
                className={`w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none focus:ring-2 focus:ring-green-100 transition caret-transparent ${
                  otpDigits[i]
                    ? 'border-[#16A34A] bg-[#F0FDF4] text-[#0B5E46]'
                    : 'border-[#E7E5E4] focus:border-[#16A34A]'
                }`}
              />
            ))}
          </div>

          {otpError && (
            <p role="alert" className="text-sm text-center text-red-600">{otpError}</p>
          )}

          {isTurnstileEnabled() && (
            <div className="flex justify-center">
              <TurnstileWidget onVerify={setTurnstileToken} resetKey={turnstileResetKey} />
            </div>
          )}

          <button
            type="button"
            onClick={() => handleOtpSubmit(otpDigits.join(''))}
            disabled={loading || otpDigits.some(d => !d) || (isTurnstileEnabled() && !turnstileToken)}
            className="h-12 w-full touch-manipulation bg-[#16A34A] text-white font-bold rounded-lg text-base transition-all duration-150 ease-out hover:bg-green-700 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-[#16A34A]/40 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:ring-0 disabled:active:scale-100"
          >
            {loading ? t.otp.verifying : t.otp.validateCode}
          </button>

          <div className="text-center">
            {resendCooldown > 0 ? (
              <p className="text-sm text-gray-400">{t.otp.resendIn(resendCooldown)}</p>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || (isTurnstileEnabled() && !turnstileToken)}
                className="text-sm text-[#16A34A] font-medium transition-all duration-150 ease-out hover:scale-[1.03] hover:text-[#15803D] hover:underline active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
              >
                {t.otp.resendCode}
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setStep('form')
            setOtpDigits(['', '', '', ''])
            setOtpError(null)
            setTurnstileToken('')
            setTurnstileResetKey(k => k + 1)
          }}
          className="w-full text-sm text-gray-400 hover:text-gray-600 text-center py-2 touch-manipulation transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97]"
        >
          {t.otp.backToEdit}
        </button>
      </div>
    )
  } else {
    // ── Order form ────────────────────────────────────────────────────────────────
    const isMultiVariant = hasVariants && selectedProduct && selectedProduct.variants.length > 1

    inner = (
      <form ref={formTopRef} onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#0B5E46] text-white flex items-center justify-center font-bold text-base shrink-0">
            {sellerName.trim().charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1C1917]">{t.header.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t.header.at} <span className="font-medium">{sellerName}</span></p>
          </div>
        </div>

        {/* ── Coordonnées ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <p className="text-base font-bold text-[#1C1917] flex items-center gap-3">
            <span className="w-8 h-8 bg-[#0B5E46] rounded-xl text-white text-sm flex items-center justify-center shadow-sm shrink-0">1</span>
            {t.customer.sectionTitle}
          </p>

          <div>
            <label htmlFor="order-name" className="block text-sm font-medium text-gray-700 mb-1.5">{t.customer.fullNameLabel}</label>
            <div className="relative">
              <User className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="order-name"
                className="w-full border border-gray-200 rounded-xl ps-11 pe-4 py-3 text-base outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t.customer.fullNamePlaceholder}
                required
                autoComplete="name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="order-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t.customer.phoneLabel}
              <span className="text-gray-400 font-normal ml-1">{t.customer.phoneDigitsHint}</span>
            </label>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 px-3 bg-[#F5F5F4] border border-gray-200 rounded-xl text-base font-medium text-gray-500 shrink-0">
                <Phone className="w-3.5 h-3.5" />
                +216
              </span>
              <input
                id="order-phone"
                className={`min-w-0 flex-1 border rounded-xl px-4 py-3 text-base outline-none focus:ring-2 transition ${phoneError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-[#16A34A] focus:ring-green-100'}`}
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
                required
                inputMode="numeric"
                autoComplete="tel"
              />
            </div>
            {phoneError && <p className="text-xs text-red-600 mt-1">{phoneError}</p>}
          </div>

          <div>
            <label htmlFor="order-email" className="block text-sm font-medium text-gray-700 mb-1.5">{t.customer.emailLabel}</label>
            <div className="relative">
              <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="order-email"
                className={`w-full border rounded-xl ps-11 pe-4 py-3 text-base outline-none focus:ring-2 transition ${emailError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-[#16A34A] focus:ring-green-100'}`}
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError(null) }}
                placeholder={t.customer.emailPlaceholder}
                required
                autoComplete="email"
                inputMode="email"
              />
            </div>
            {emailError
              ? <p className="text-xs text-red-600 mt-1">{emailError}</p>
              : <p className="text-xs text-gray-400 mt-1">{t.customer.emailHelper}</p>
            }
          </div>

          <div>
            <label htmlFor="order-governorate" className="block text-sm font-medium text-gray-700 mb-1.5">{t.customer.governorateLabel}</label>
            <div className="relative">
              <MapPin className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                id="order-governorate"
                className="w-full border border-gray-200 rounded-xl ps-11 pe-4 py-3 text-base outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition bg-white"
                value={governorate}
                onChange={e => setGovernorate(e.target.value)}
                required
              >
                <option value="">{t.customer.governoratePlaceholder}</option>
                {TUNISIAN_GOVERNORATES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="order-city" className="block text-sm font-medium text-gray-700 mb-1.5">{t.customer.cityLabel}</label>
            <div className="relative">
              <Building2 className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="order-city"
                className="w-full border border-gray-200 rounded-xl ps-11 pe-4 py-3 text-base outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition"
                value={customerCity}
                onChange={e => setCustomerCity(e.target.value)}
                placeholder={t.customer.cityPlaceholder}
                required
                autoComplete="address-level2"
              />
            </div>
          </div>

          <div>
            <label htmlFor="order-address" className="block text-sm font-medium text-gray-700 mb-1.5">{t.customer.addressLabel}</label>
            <div className="relative">
              <Home className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="order-address"
                className="w-full border border-gray-200 rounded-xl ps-11 pe-4 py-3 text-base outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder={t.customer.addressPlaceholder}
                required
                autoComplete="street-address"
              />
            </div>
          </div>

          <div>
            <label htmlFor="order-landmark" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t.customer.landmarkLabel}
              <span className="text-gray-400 font-normal ml-1">{t.common.optional}</span>
            </label>
            <div className="relative">
              <Landmark className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="order-landmark"
                className="w-full border border-gray-200 rounded-xl ps-11 pe-4 py-3 text-base outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition"
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                placeholder={t.customer.landmarkPlaceholder}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="order-postal-code" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.customer.postalCodeLabel} <span className="text-gray-400 font-normal">{t.common.optional}</span>
              </label>
              <div className="relative">
                <Hash className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="order-postal-code"
                  className="w-full border border-gray-200 rounded-xl ps-11 pe-4 py-3 text-base outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition"
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder={t.customer.postalCodePlaceholder}
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="postal-code"
                />
              </div>
            </div>
            <div>
              <label htmlFor="order-delegation" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.customer.delegationLabel} <span className="text-gray-400 font-normal">{t.common.optional}</span>
              </label>
              <div className="relative">
                <MapPin className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  id="order-delegation"
                  className="w-full border border-gray-200 rounded-xl ps-11 pe-4 py-3 text-base outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition"
                  value={delegation}
                  onChange={e => setDelegation(e.target.value)}
                  placeholder={t.customer.delegationPlaceholder}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Produit ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <p className="text-base font-bold text-[#1C1917] flex items-center gap-3">
            <span className="w-8 h-8 bg-[#0B5E46] rounded-xl text-white text-sm flex items-center justify-center shadow-sm shrink-0">2</span>
            {t.order.sectionTitle}
          </p>

          <div>
            <label htmlFor="order-product" className="block text-sm font-medium text-gray-700 mb-1.5">{t.order.productLabel}</label>
            <div className="relative">
              <Package className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                id="order-product"
                className="w-full border border-gray-200 rounded-xl ps-11 pe-4 py-3 text-base outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition bg-white"
                value={productId}
                onChange={e => setProductId(e.target.value)}
                required
              >
                <option value="">{t.order.productPlaceholder}</option>
                {visibleProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.price} DT
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="mt-2 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3.5 flex items-center gap-3 shadow-sm transition-all duration-200">
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
                  <p className="text-sm font-bold text-[#16A34A]">{getVariantPrice(selectedProduct.variants, variant || null, selectedProduct.price)} DT</p>
                  {!hasVariants && (
                    <p className="text-xs text-[#78716C]">
                      {t.order.stockAvailable(selectedProduct.stock)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Multi-variant grid */}
          {isMultiVariant && selectedProduct && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.order.variantsQtyLabel}
              </label>
              <div className="space-y-2">
                {selectedProduct.variants.map((v, i) => {
                  const label = getVariantLabel(v, i)
                  const isOut = v.qty === 0 || exhaustedVariantKeys.has(getVariantKey(productId, label))
                  const currentQty = variantQtys[label] ?? 0
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                        isOut
                          ? 'border-[#E7E5E4] opacity-40'
                          : currentQty > 0
                            ? 'border-[#16A34A] bg-[#F0FDF4]'
                            : 'border-gray-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isOut ? 'line-through text-gray-400' : 'text-[#1C1917]'}`}>
                          {label}
                        </p>
                        <p className="text-xs text-gray-400">
                          {v.price != null && !isOut && (
                            <span className="font-semibold text-[#16A34A]">{v.price} DT · </span>
                          )}
                          {isOut ? t.order.variantExhausted : t.order.variantDispo(v.qty)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isOut || currentQty <= 0}
                          onClick={() => setVariantQtys(prev => ({ ...prev, [label]: Math.max(0, (prev[label] ?? 0) - 1) }))}
                          className="w-9 h-9 touch-manipulation rounded-lg border border-[#16A34A] flex items-center justify-center text-[#16A34A] hover:bg-green-50 font-bold text-lg transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-base font-bold text-[#1C1917]">
                          {currentQty}
                        </span>
                        <button
                          type="button"
                          disabled={isOut || currentQty >= v.qty}
                          onClick={() => setVariantQtys(prev => ({ ...prev, [label]: Math.min(v.qty, (prev[label] ?? 0) + 1) }))}
                          className="w-9 h-9 touch-manipulation rounded-lg border border-[#16A34A] flex items-center justify-center text-[#16A34A] hover:bg-green-50 font-bold text-lg transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {multiVariantQtyTotal > 0 && (
                <div className="mt-3 bg-[#F5F5F4] rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" />
                    {t.order.totalCod}
                  </span>
                  <span className="text-lg font-extrabold text-[#0B5E46]">
                    {selectedProduct.variants.reduce((sum, v, i) => {
                      const qty = variantQtys[getVariantLabel(v, i)] ?? 0
                      const unit = v.price != null && v.price >= 0 ? v.price : selectedProduct.price
                      return sum + unit * qty
                    }, 0).toFixed(0)} DT
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Single variant selector */}
          {hasVariants && selectedProduct && !isMultiVariant && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.order.variantSingleLabel}</label>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.variants.map((v, i) => {
                  const label = getVariantLabel(v, i)
                  const isOut = v.qty === 0 || exhaustedVariantKeys.has(getVariantKey(productId, label))
                  const isSelected = variant === label
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={isOut}
                      onClick={() => {
                        setVariant(label)
                        setStockError(null)
                      }}
                      className={`min-h-[44px] touch-manipulation rounded-lg px-3 py-2 text-sm transition-all duration-150 ease-out ${
                        isOut
                          ? 'border border-[#E7E5E4] opacity-40 cursor-not-allowed line-through'
                        : isSelected
                            ? 'border-2 border-[#16A34A] bg-[#F0FDF4] text-[#166534] font-medium hover:scale-[1.03] active:scale-[0.97]'
                            : 'border border-[#16A34A] text-[#16A34A] cursor-pointer hover:bg-green-50 hover:border-[#15803D] hover:text-[#15803D] hover:scale-[1.03] active:scale-[0.97]'
                      }`}
                    >
                      {label}
                      {!isOut && v.price != null && (
                        <span className="ml-1 text-xs font-semibold">— {v.price} DT</span>
                      )}
                      {isOut ? (
                        <span className="ml-1 text-xs">{t.order.variantExhaustedInline}</span>
                      ) : (
                        <span className="ml-1 text-xs text-gray-400">{t.order.variantDispoInline(v.qty)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quantity for non-multi-variant */}
          {!isMultiVariant && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.order.quantityLabel}</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-11 h-11 touch-manipulation rounded-lg border border-[#16A34A] flex items-center justify-center text-[#16A34A] hover:bg-green-50 font-bold text-lg transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97]"
                >
                  −
                </button>
                <span className="text-lg font-bold text-[#1C1917] w-8 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                  disabled={!selectedProduct || (hasVariants && !variant)}
                  className="w-11 h-11 touch-manipulation rounded-lg border border-[#16A34A] flex items-center justify-center text-[#16A34A] hover:bg-green-50 font-bold text-lg transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                >
                  +
                </button>
                {selectedProduct && (
                  <span className="text-xs text-gray-400 ml-1">
                    {selectedVariant ? t.order.variantDispo(selectedVariant.qty) : !hasVariants ? t.order.variantDispo(selectedProduct.stock) : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {selectedProduct && !isMultiVariant && (
            <div className="bg-[#F5F5F4] rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-1.5">
                <Wallet className="w-4 h-4" />
                {t.order.totalCod}
              </span>
              <span className="text-lg font-extrabold text-[#0B5E46]">
                {(getVariantPrice(selectedProduct.variants, variant || null, selectedProduct.price) * quantity).toFixed(0)} DT
              </span>
            </div>
          )}
        </div>

        {/* ── Note ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t.notes.label}
            <span className="text-gray-400 font-normal ml-1">{t.common.optional}</span>
          </label>
          <div className="relative">
            <MessageSquare className="absolute start-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            <textarea
              className="w-full border border-gray-200 rounded-xl ps-11 pe-4 py-3 text-base outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-green-100 transition resize-none"
              rows={3}
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

        {stockError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <PackageX className="text-red-500 w-6 h-6 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">
                {stockErrorScope === 'variant' ? t.stockError.variantUnavailableTitle : t.stockError.productUnavailableTitle}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {stockErrorScope === 'variant'
                  ? t.stockError.variantUnavailableDesc
                  : t.stockError.productUnavailableDesc}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (stockErrorScope === 'product') setProductId('')
                  setVariant('')
                  setQuantity(1)
                  setVariantQtys({})
                  setStockError(null)
                  formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="mt-2 min-h-[44px] touch-manipulation text-xs font-semibold text-red-700 underline underline-offset-2 transition-all duration-150 ease-out hover:scale-[1.03] hover:text-red-800 active:scale-[0.97]"
              >
                {stockErrorScope === 'variant' ? t.stockError.chooseAnotherVariant : t.stockError.chooseAnotherProduct}
              </button>
            </div>
          </div>
        )}

        {isTurnstileEnabled() && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <TurnstileWidget onVerify={setTurnstileToken} resetKey={turnstileResetKey} />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (isTurnstileEnabled() && !turnstileToken)}
          className="h-12 w-full touch-manipulation bg-[#16A34A] text-white font-bold rounded-lg text-base transition-all duration-150 ease-out hover:bg-green-700 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-[#16A34A]/40 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:ring-0 disabled:active:scale-100"
        >
          {loading ? (
            t.submit.sendingCode
          ) : (
            <span className="flex items-center justify-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              {t.submit.orderButton}
            </span>
          )}
        </button>

        <p className="text-xs text-[#78716C] text-center mt-2">
          {t.legal.text}{' '}
          <a href="/privacy" className="underline hover:text-[#1C1917]">{t.legal.privacyLink}</a>.
        </p>
      </form>
    )
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className={isRtl ? 'font-arabic' : undefined}>
      {langToggleButton}
      {inner}
    </div>
  )
}
