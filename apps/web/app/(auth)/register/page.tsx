'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'boutique'
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [shopName, setShopName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: shopName, phone } },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Erreur lors de la création du compte.')
      setLoading(false)
      return
    }

    // Generate slug from shop name, retry with -2/-3 on unique conflict
    const baseSlug = generateSlug(shopName)
    let inserted = false

    for (let attempt = 0; attempt < 10; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`
      const { error: profileError } = await supabase.from('sellers').insert({
        id: data.user.id,
        email,
        name: shopName,
        phone: phone || null,
        slug,
      })

      if (!profileError) {
        inserted = true
        break
      }

      // 23505 = unique_violation — try next slug
      if (profileError.code !== '23505') {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    if (!inserted) {
      setError('Impossible de créer le profil. Réessayez.')
      setLoading(false)
      return
    }

    // Email confirmation required → redirect to verify page
    if (!data.session) {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
      return
    }

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

        <button type="submit" disabled={loading} className="btn-primary w-full">
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
