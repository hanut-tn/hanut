'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { TurnstileWidget, isTurnstileEnabled } from '@/components/ui/TurnstileWidget'
import PasswordStrengthIndicator from '@/components/ui/PasswordStrengthIndicator'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const [termsAccepted, setTermsAccepted] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isTurnstileEnabled() && !turnstileToken) {
      setError('Vérification anti-spam échouée. Réessayez.')
      setLoading(false)
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPhone = phone.trim()

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop_name: displayName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone || undefined,
        password,
        turnstile_token: turnstileToken || undefined,
        terms_accepted: termsAccepted,
      }),
    }).catch(() => null)

    if (!response) {
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.')
      setTurnstileToken('')
      setTurnstileResetKey(key => key + 1)
      setLoading(false)
      return
    }

    const data = await response.json().catch(() => ({} as { error?: string; session?: { access_token: string; refresh_token: string } | null }))
    if (!response.ok) {
      setError(data.error ?? 'Erreur lors de la création du compte.')
      setTurnstileToken('')
      setTurnstileResetKey(key => key + 1)
      setLoading(false)
      return
    }

    // Email confirmation required → redirect to verify page
    if (!data.session) {
      router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`)
      return
    }

    await supabase.auth.setSession(data.session)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="card p-8">
      <Link
        href="/"
        className="mb-5 inline-flex text-sm font-medium text-[#16A34A] hover:text-[#0B5E46] hover:underline"
      >
        ← Retour à l&apos;accueil
      </Link>

      <h2 className="text-xl font-semibold text-gray-900 mb-6">Créer votre compte</h2>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
            Nom
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="input"
            placeholder="Votre nom"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Ce nom s&apos;affiche dans le dashboard. Le nom de boutique se configure ensuite avec votre lien de commande.
          </p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
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

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Téléphone <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="input"
            placeholder="+216 XX XXX XXX"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input"
            placeholder="Minimum 8 caractères"
            required
            autoComplete="new-password"
          />
          <PasswordStrengthIndicator password={password} />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isTurnstileEnabled() && (
          <TurnstileWidget onVerify={setTurnstileToken} resetKey={turnstileResetKey} />
        )}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => setTermsAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            required
          />
          <span className="text-sm text-gray-600">
            J&apos;accepte les{' '}
            <Link href="/legal" className="font-medium text-brand-600 hover:text-brand-700 underline" target="_blank">Conditions Générales d&apos;Utilisation</Link>
            {' '}et la{' '}
            <Link href="/privacy" className="font-medium text-brand-600 hover:text-brand-700 underline" target="_blank">Politique de confidentialité</Link>
          </span>
        </label>

        <button type="submit" disabled={loading || !termsAccepted || (isTurnstileEnabled() && !turnstileToken)} className="btn-primary w-full">
          {loading ? 'Création...' : 'Créer mon compte'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
