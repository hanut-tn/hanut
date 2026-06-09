'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { TurnstileWidget, isTurnstileEnabled } from '@/components/ui/TurnstileWidget'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [shopName, setShopName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isTurnstileEnabled() && !turnstileToken) {
      setError('Vérification anti-spam échouée. Réessayez.')
      setLoading(false)
      return
    }

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop_name: shopName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
        turnstile_token: turnstileToken || undefined,
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
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
      return
    }

    await supabase.auth.setSession(data.session)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="card p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Créer votre boutique</h2>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="shopName" className="block text-sm font-medium text-gray-700 mb-1">
            Nom de la boutique
          </label>
          <input
            id="shopName"
            type="text"
            value={shopName}
            onChange={e => setShopName(e.target.value)}
            className="input"
            placeholder="Ma boutique"
            required
          />
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
            minLength={8}
            autoComplete="new-password"
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

        <button type="submit" disabled={loading || (isTurnstileEnabled() && !turnstileToken)} className="btn-primary w-full">
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
