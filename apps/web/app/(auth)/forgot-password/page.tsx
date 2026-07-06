'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { TurnstileWidget, isTurnstileEnabled } from '@/components/ui/TurnstileWidget'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (isTurnstileEnabled() && !turnstileToken) {
      setError('Vérification anti-spam échouée. Réessayez.')
      return
    }

    setLoading(true)
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), turnstile_token: turnstileToken }),
    }).catch(() => null)
    setLoading(false)
    setTurnstileToken('')
    setTurnstileResetKey(key => key + 1)
    if (!response) {
      setError('Erreur réseau. Vérifiez votre connexion.')
      return
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({} as { error?: string }))
      setError(data.error ?? "Impossible d'envoyer l'email. Réessayez.")
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="card p-8 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-[#16A34A] mx-auto" />
        <p className="font-semibold text-gray-900">Email envoyé !</p>
        <p className="text-sm text-[#78716C]">
          Vérifiez votre boîte mail. Le lien est valable 1 heure.
        </p>
        <Link href="/login" className="text-sm text-[#16A34A] hover:underline block mt-4">
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <div className="card p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Réinitialiser votre mot de passe</h2>
      <p className="text-sm text-gray-500 mb-6">
        Entrez votre email et nous vous enverrons un lien de réinitialisation.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input"
            placeholder="vous@exemple.com"
            required
            autoComplete="email"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isTurnstileEnabled() && (
          <TurnstileWidget onVerify={setTurnstileToken} resetKey={turnstileResetKey} />
        )}

        <button
          type="submit"
          disabled={loading || (isTurnstileEnabled() && !turnstileToken)}
          className="btn-primary w-full"
        >
          {loading ? 'Envoi...' : 'Envoyer le lien'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-[#16A34A] hover:underline">
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  )
}
