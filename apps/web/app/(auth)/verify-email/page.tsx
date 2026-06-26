'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function VerifyEmailContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const confirmed = searchParams.get('confirmed') === '1'
  const [resent, setResent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleResend() {
    if (!email || cooldown > 0) return
    setError(null)
    setResent(false)
    setLoading(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setLoading(false)
    if (error) {
      setError("Impossible de renvoyer l'email. Réessayez dans un moment.")
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
              Votre adresse email est confirmée. Votre compte Hanut est maintenant actif.
            </p>
          </div>

          <Link href="/dashboard" className="btn-primary w-full block">
            Accéder à mon tableau de bord
          </Link>
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
            <button
              onClick={handleResend}
              disabled={loading || !email || cooldown > 0}
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
