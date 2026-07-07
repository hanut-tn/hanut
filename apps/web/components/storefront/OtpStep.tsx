'use client'

import { useEffect, useRef, useState } from 'react'
import { TurnstileWidget, isTurnstileEnabled } from '@/components/ui/TurnstileWidget'
import { cartToOrderItems, type CartItem } from '@/lib/storefront/cart'
import type { StorefrontDict } from '@/lib/i18n/storefront'
import type { CheckoutData } from './CheckoutForm'

type Props = {
  sellerSlug: string
  cart: CartItem[]
  checkoutData: CheckoutData
  t: StorefrontDict
  onBack: () => void
  onStockConflict: () => void
  onSuccess: (result: { orderId: string; trackingToken: string }) => void
}

export default function OtpStep({
  sellerSlug, cart, checkoutData, t, onBack, onStockConflict, onSuccess,
}: Props) {
  const [otpDigits, setOtpDigits] = useState(['', '', '', ''])
  const [otpError, setOtpError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(60)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const otpRef0 = useRef<HTMLInputElement>(null)
  const otpRef1 = useRef<HTMLInputElement>(null)
  const otpRef2 = useRef<HTMLInputElement>(null)
  const otpRef3 = useRef<HTMLInputElement>(null)
  const otpRefs = [otpRef0, otpRef1, otpRef2, otpRef3]
  const submittingRef = useRef(false)

  useEffect(() => {
    const focusTimer = setTimeout(() => otpRef0.current?.focus(), 100)
    return () => clearTimeout(focusTimer)
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  async function handleVerify(code: string) {
    if (loading || submittingRef.current) return
    if (code.length !== 4) {
      setOtpError(t.otp.otpEmpty)
      return
    }
    if (isTurnstileEnabled() && !turnstileToken) {
      setOtpError(t.otp.otpTurnstilePending)
      return
    }
    submittingRef.current = true
    setOtpError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/orders/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: sellerSlug,
          email: checkoutData.email.trim().toLowerCase(),
          code,
          customer_name: checkoutData.name.trim(),
          customer_phone: checkoutData.phone.replace(/\D/g, ''),
          customer_governorate: checkoutData.governorate,
          customer_city: checkoutData.city.trim(),
          customer_address: checkoutData.address.trim(),
          customer_landmark: checkoutData.landmark.trim() || undefined,
          delivery_notes: checkoutData.deliveryNotes.trim() || undefined,
          turnstile_token: turnstileToken || undefined,
          items: cartToOrderItems(cart),
        }),
      })
      const data = await res.json()
      setTurnstileToken('')
      setTurnstileResetKey(k => k + 1)
      if (!res.ok) {
        // 409 = stock épuisé pendant la commande : retour automatique à la
        // boutique avec panier et catalogue rafraîchis.
        if (res.status === 409) {
          onStockConflict()
          return
        }
        setOtpError(data.error ?? t.otp.otpInvalid)
        setOtpDigits(['', '', '', ''])
        setTimeout(() => otpRef0.current?.focus(), 100)
        return
      }
      onSuccess({
        orderId: data.order_id as string,
        trackingToken: data.tracking_token as string,
      })
    } catch {
      setTurnstileToken('')
      setTurnstileResetKey(k => k + 1)
      setOtpError(t.otp.otpNetworkError)
      setOtpDigits(['', '', '', ''])
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  async function handleResend() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/orders/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: sellerSlug,
          email: checkoutData.email.trim().toLowerCase(),
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

  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...otpDigits]
    newDigits[index] = digit
    setOtpDigits(newDigits)
    if (digit) {
      if (index < 3) {
        otpRefs[index + 1].current?.focus()
      } else if (newDigits.every(d => d !== '')) {
        handleVerify(newDigits.join(''))
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const newDigits = [...otpDigits]
      newDigits[index - 1] = ''
      setOtpDigits(newDigits)
      otpRefs[index - 1].current?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (digits.length === 4) {
      setOtpDigits(digits.split(''))
      handleVerify(digits)
    } else if (digits.length > 0) {
      const newDigits = ['', '', '', '']
      for (let i = 0; i < digits.length; i++) newDigits[i] = digits[i]
      setOtpDigits(newDigits)
      otpRefs[Math.min(digits.length, 3)].current?.focus()
    }
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#1C1917]">{t.otp.title}</h2>
        <p className="text-sm text-gray-500 mt-1.5">{t.otp.sentTo}</p>
        <p className="text-sm font-semibold text-[#1C1917] mt-0.5 break-all">{checkoutData.email}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
        <div className="flex gap-3 justify-center" onPaste={handlePaste} dir="ltr">
          {otpRefs.map((ref, i) => (
            <input
              key={i}
              ref={ref}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={otpDigits[i]}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
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
          onClick={() => handleVerify(otpDigits.join(''))}
          disabled={loading || otpDigits.some(d => !d) || (isTurnstileEnabled() && !turnstileToken)}
          className="h-12 w-full touch-manipulation bg-[#16A34A] text-white font-bold rounded-lg text-base transition-all duration-150 ease-out hover:bg-[#15803D] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t.otp.verifying : t.otp.validateCode}
        </button>

        <div className="text-center">
          {resendCooldown > 0 ? (
            <p className="text-sm text-[#78716C]">{t.otp.resendIn(resendCooldown)}</p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || (isTurnstileEnabled() && !turnstileToken)}
              className="text-sm text-[#16A34A] font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.otp.resendCode}
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-[#78716C] hover:text-gray-600 text-center py-2 touch-manipulation transition-colors"
      >
        {t.otp.backToEdit}
      </button>
    </div>
  )
}
