'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === 'loading') return
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        return
      }
      if (typeof data.message === 'string' && data.message.toLowerCase().includes('déjà')) {
        setStatus('duplicate')
      } else {
        setStatus('success')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-[#16A34A] mt-6">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Merci ! On vous contacte bientôt.
      </div>
    )
  }

  return (
    <div className="mt-6">
      <p className="text-xs text-[#78716C] text-center mb-3">ou</p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Votre email..."
          className="min-h-[44px] flex-1 border border-[#E7E5E4] rounded-lg px-4 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent md:text-sm"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="min-h-[44px] touch-manipulation bg-[#0B5E46] text-white rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap hover:bg-[#0a5240] disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? '...' : 'Me prévenir des nouveautés'}
        </button>
      </form>
      {status === 'duplicate' && (
        <p className="text-sm text-amber-600 text-center mt-2">Vous êtes déjà sur la liste !</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-500 text-center mt-2">Erreur. Réessayez dans quelques secondes.</p>
      )}
      <p className="text-xs text-[#78716C] text-center mt-2">
        Rejoignez les vendeurs tunisiens qui utilisent Hanut
      </p>
    </div>
  )
}
