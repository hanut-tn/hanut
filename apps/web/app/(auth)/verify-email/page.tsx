'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Mail } from 'lucide-react'
import { HANUT_CONTACT } from '@/lib/constants'
import { TurnstileWidget, isTurnstileEnabled } from '@/components/ui/TurnstileWidget'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const confirmed = searchParams.get('confirmed') === '1'
  const setupError = searchParams.get('setup_error') === '1'
  const [resent, setResent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  const whatsappBase = whatsappNumber ? `https://wa.me/${whatsappNumber}` : 'https://wa.me/21654727060'
  const whatsappMsg = email
    ? `Bonjour, j'ai un problème avec l'activation de mon compte Hanut. Mon email : ${email}`
    : "Bonjour, j'ai un problème avec l'activation de mon compte Hanut."
  const whatsappUrl = `${whatsappBase}?text=${encodeURIComponent(whatsappMsg)}`

  async function handleRetry() {
    setRetrying(true)
    setRetryError(null)
    try {
      const res = await fetch('/api/auth/retry-profile', { method: 'POST' })
      if (res.ok) {
        router.push('/dashboard')
      } else {
        const data = await res.json().catch(() => ({}))
        setRetryError((data as { error?: string }).error ?? "L'activation a échoué. Contactez le support.")
      }
    } catch {
      setRetryError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setRetrying(false)
    }
  }

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleResend() {
    if (!email || cooldown > 0) return
    if (isTurnstileEnabled() && !turnstileToken) {
      setError('Vérification anti-spam échouée. Réessayez.')
      return
    }
    setError(null)
    setResent(false)
    setLoading(true)
    const response = await fetch('/api/auth/resend-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, turnstile_token: turnstileToken }),
    }).catch(() => null)
    setLoading(false)
    setTurnstileToken('')
    setTurnstileResetKey(key => key + 1)
    if (!response) {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } else if (!response.ok) {
      const data = await response.json().catch(() => ({} as { error?: string }))
      setError(data.error ?? "Impossible de renvoyer l'email. Réessayez dans un moment.")
    } else {
      setResent(true)
      setCooldown(60)
    }
  }

  return (
    <div className="card p-8 text-center space-y-5">
      <div className="w-14 h-14 bg-[#F0FDF4] rounded-2xl flex items-center justify-center mx-auto">
        {confirmed
          ? <CheckCircle className="w-7 h-7 text-[#16A34A]" />
          : <Mail className="w-7 h-7 text-[#16A34A]" />}
      </div>
      {confirmed ? (
        <>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Email confirmé</h2>
            <p className="text-sm text-[#78716C] mt-2">
              {setupError
                ? "Votre adresse email est confirmée, mais l'activation de votre boutique a échoué."
                : 'Votre adresse email est confirmée. Votre compte Hanut est maintenant actif.'}
            </p>
          </div>

          {setupError ? (
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="btn-primary w-full disabled:opacity-50"
              >
                {retrying ? 'Activation en cours...' : 'Réessayer'}
              </button>
              {retryError && (
                <p className="text-sm text-red-600">{retryError}</p>
              )}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full block text-center"
              >
                Contacter le support via WhatsApp
              </a>
              <p className="text-xs text-[#78716C]">
                Un problème ? Contactez-nous sur{' '}
                <a href={`mailto:${HANUT_CONTACT.email}`} className="text-[#16A34A] hover:underline">
                  {HANUT_CONTACT.email}
                </a>
              </p>
            </div>
          ) : (
            <Link href="/dashboard" className="btn-primary w-full block">
              Accéder à mon tableau de bord
            </Link>
          )}
        </>
      ) : (
        <>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Vérifiez votre email</h2>
            {email && (
              <p className="text-sm text-[#78716C] mt-2">
                Un email de confirmation a été envoyé à{' '}
                <strong className="text-gray-800">{email}</strong>
              </p>
            )}
            <p className="text-sm text-[#78716C] mt-1">
              Cliquez sur le lien dans l&apos;email pour activer votre compte.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <p className="text-xs text-[#78716C]">Vous n&apos;avez pas reçu l&apos;email ?</p>
            {resent && cooldown === 0 && (
              <p className="text-sm text-[#16A34A] font-medium">Email renvoyé ✓</p>
            )}
            {isTurnstileEnabled() && cooldown === 0 && (
              <TurnstileWidget onVerify={setTurnstileToken} resetKey={turnstileResetKey} />
            )}
            <button
              onClick={handleResend}
              disabled={loading || !email || cooldown > 0 || (isTurnstileEnabled() && !turnstileToken)}
              className="btn-secondary text-sm w-full disabled:opacity-50"
            >
              {loading
                ? 'Envoi...'
                : cooldown > 0
                  ? `Renvoyer dans ${cooldown}s`
                  : "Renvoyer l'email de confirmation"}
            </button>
          </div>

          <Link href="/login" className="text-sm text-[#16A34A] hover:underline block pt-2">
            ← Retour à la connexion
          </Link>
        </>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="card p-8" />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
