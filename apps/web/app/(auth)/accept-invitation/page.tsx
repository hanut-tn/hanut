'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isPasswordValid, PASSWORD_ERROR_MESSAGE } from '@/lib/password-policy'
import PasswordStrengthIndicator from '@/components/ui/PasswordStrengthIndicator'

export default function AcceptInvitationPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isPasswordValid(password)) {
      setError(PASSWORD_ERROR_MESSAGE)
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(
        updateError.message.includes('Auth session missing')
          ? "Le lien d'invitation est invalide ou expiré. Demandez une nouvelle invitation."
          : updateError.message
      )
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.replace('/dashboard')
      router.refresh()
    }, 1200)
  }

  if (success) {
    return (
      <div className="card p-8 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-[#16A34A] mx-auto" />
        <p className="font-semibold text-gray-900">Invitation acceptée</p>
        <p className="text-sm text-[#78716C]">Ouverture de votre espace Hanut...</p>
      </div>
    )
  }

  return (
    <div className="card p-8">
      <div className="w-11 h-11 rounded-lg bg-[#F0FDF4] flex items-center justify-center mb-4">
        <Users className="w-5 h-5 text-[#16A34A]" />
      </div>

      <h2 className="text-xl font-semibold text-gray-900">Rejoindre l&apos;équipe</h2>
      <p className="text-sm text-gray-500 mt-2 mb-6">
        Choisissez votre mot de passe pour activer votre accès à Hanut.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Créer un mot de passe *
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

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
            Confirmer le mot de passe *
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="input"
            placeholder="Répéter le mot de passe"
            required
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full min-h-[44px] touch-manipulation"
        >
          {loading ? 'Activation...' : "Accepter l'invitation"}
        </button>
      </form>
    </div>
  )
}
