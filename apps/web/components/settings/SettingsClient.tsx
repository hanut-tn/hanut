'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ProfileInput } from '@/app/(dashboard)/settings/actions'

const PLAN_CONFIG = {
  starter:  { label: 'Starter',  color: 'bg-gray-100 text-gray-700',     price: 'Gratuit' },
  pro:      { label: 'Pro',      color: 'bg-brand-100 text-brand-700',    price: '29 DT/mois' },
  business: { label: 'Business', color: 'bg-purple-100 text-purple-800',  price: '79 DT/mois' },
}

const PLANS: {
  key: 'starter' | 'pro' | 'business'
  label: string
  price: string
  features: string[]
  recommended?: boolean
}[] = [
  {
    key: 'starter',
    label: 'Starter',
    price: 'Gratuit',
    features: [
      '50 commandes / mois',
      '20 produits max',
      'Analytiques de base',
      'Support par email',
    ],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '29 DT / mois',
    features: [
      '500 commandes / mois',
      'Produits illimités',
      'Analytiques complètes',
      'Export CSV',
      'Support prioritaire',
    ],
    recommended: true,
  },
  {
    key: 'business',
    label: 'Business',
    price: '79 DT / mois',
    features: [
      'Commandes illimitées',
      'Produits illimités',
      'Multi-utilisateurs (5)',
      'Accès API',
      'Gestionnaire dédié',
    ],
  },
]

type Seller = {
  name: string
  email: string
  phone: string
  plan: 'starter' | 'pro' | 'business'
  subscription_end: string | null
  created_at: string | null
}

type Props = {
  seller: Seller
  stats: { products: number; customers: number; orders: number }
  updateProfile: (input: ProfileInput) => Promise<void>
}

type Tab = 'profile' | 'security' | 'plan'

type Msg = { type: 'success' | 'error'; text: string }

export default function SettingsClient({ seller, stats, updateProfile }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('profile')
  const [isPending, startTransition] = useTransition()

  // Profile
  const [name, setName] = useState(seller.name)
  const [phone, setPhone] = useState(seller.phone)
  const [profileMsg, setProfileMsg] = useState<Msg | null>(null)

  // Password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMsg, setPwMsg] = useState<Msg | null>(null)
  const [pwPending, setPwPending] = useState(false)

  // Logout all
  const [logoutPending, setLogoutPending] = useState(false)

  const initials = seller.name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const planCfg = PLAN_CONFIG[seller.plan]

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setProfileMsg(null)
    startTransition(async () => {
      try {
        await updateProfile({ name: name.trim(), phone: phone.trim() })
        setProfileMsg({ type: 'success', text: 'Profil mis à jour avec succès.' })
      } catch (err) {
        setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur inconnue' })
      }
    })
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (newPassword.length < 8) {
      setPwMsg({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
      return
    }
    setPwPending(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwPending(false)
    if (error) {
      setPwMsg({ type: 'error', text: error.message })
    } else {
      setPwMsg({ type: 'success', text: 'Mot de passe changé avec succès.' })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  async function handleLogoutAll() {
    setLogoutPending(true)
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/login')
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'profile',  label: 'Profil' },
    { key: 'security', label: 'Sécurité' },
    { key: 'plan',     label: 'Abonnement' },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>

      {/* Profile card */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 select-none">
          {initials || '?'}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-lg truncate">{seller.name}</p>
          <p className="text-sm text-gray-500 truncate">{seller.email}</p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${planCfg.color}`}>
            {planCfg.label}
          </span>
        </div>
        <div className="ml-auto flex gap-5 text-center flex-shrink-0">
          {([
            { label: 'Produits',   val: stats.products },
            { label: 'Clients',    val: stats.customers },
            { label: 'Commandes',  val: stats.orders },
          ] as const).map(s => (
            <div key={s.label}>
              <p className="text-xl font-bold text-gray-900">{s.val}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROFIL ── */}
      {tab === 'profile' && (
        <form onSubmit={handleProfileSave} className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Informations personnelles</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
            <input
              className="input bg-gray-50 text-gray-400 cursor-not-allowed"
              value={seller.email}
              readOnly
            />
            <p className="text-xs text-gray-400 mt-1">L&apos;email ne peut pas être modifié.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
            <input
              className="input"
              value={name}
              onChange={e => { setName(e.target.value); setProfileMsg(null) }}
              placeholder="Prénom Nom"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              className="input"
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setProfileMsg(null) }}
              placeholder="+216 XX XXX XXX"
            />
          </div>

          {seller.created_at && (
            <p className="text-xs text-gray-400">
              Compte créé le{' '}
              {new Date(seller.created_at).toLocaleDateString('fr-TN', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </p>
          )}

          {profileMsg && (
            <div className={`rounded-lg px-4 py-3 text-sm ${
              profileMsg.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {profileMsg.text}
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {/* ── SÉCURITÉ ── */}
      {tab === 'security' && (
        <div className="space-y-4">
          <form onSubmit={handlePasswordChange} className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Changer le mot de passe</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPwMsg(null) }}
                placeholder="Minimum 8 caractères"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe
              </label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPwMsg(null) }}
                placeholder="Répéter le mot de passe"
                required
              />
            </div>

            {pwMsg && (
              <div className={`rounded-lg px-4 py-3 text-sm ${
                pwMsg.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {pwMsg.text}
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" disabled={pwPending} className="btn-primary">
                {pwPending ? 'Changement...' : 'Changer le mot de passe'}
              </button>
            </div>
          </form>

          {/* Sessions */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-1">Sessions actives</h2>
            <p className="text-sm text-gray-500 mb-4">
              Déconnectez votre compte de tous les appareils simultanément.
            </p>
            <button
              onClick={handleLogoutAll}
              disabled={logoutPending}
              className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50"
            >
              {logoutPending ? 'Déconnexion...' : 'Déconnecter tous les appareils'}
            </button>
          </div>
        </div>
      )}

      {/* ── ABONNEMENT ── */}
      {tab === 'plan' && (
        <div className="space-y-4">
          {/* Current plan summary */}
          <div className="card p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Abonnement actuel</p>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-sm font-semibold ${planCfg.color}`}>
                  {planCfg.label}
                </span>
                <span className="text-gray-500 text-sm">— {planCfg.price}</span>
              </div>
            </div>
            {seller.subscription_end && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Renouvellement le</p>
                <p className="text-sm font-medium text-gray-700">
                  {new Date(seller.subscription_end).toLocaleDateString('fr-TN', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-3 gap-3">
            {PLANS.map(plan => {
              const isCurrent = plan.key === seller.plan
              const isUpgrade =
                (seller.plan === 'starter' && (plan.key === 'pro' || plan.key === 'business')) ||
                (seller.plan === 'pro' && plan.key === 'business')

              return (
                <div
                  key={plan.key}
                  className={`card p-4 flex flex-col relative ${
                    plan.recommended ? 'ring-2 ring-brand-500' : ''
                  } ${isCurrent ? 'bg-gray-50' : ''}`}
                >
                  {plan.recommended && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap shadow">
                      Populaire
                    </span>
                  )}
                  <div className="mb-3">
                    <p className="font-bold text-gray-900">{plan.label}</p>
                    <p className={`font-semibold text-lg mt-0.5 ${plan.recommended ? 'text-brand-600' : 'text-gray-800'}`}>
                      {plan.price}
                    </p>
                  </div>
                  <ul className="space-y-1.5 flex-1 mb-4">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-1.5 text-sm text-gray-600">
                        <span className="text-green-500 mt-0.5 flex-shrink-0 text-xs">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className="w-full text-center py-2 rounded-lg bg-gray-200 text-gray-500 text-sm font-medium">
                      Plan actuel
                    </div>
                  ) : (
                    <button
                      className={`w-full text-sm py-2 rounded-lg font-medium transition-colors ${
                        plan.recommended
                          ? 'btn-primary'
                          : isUpgrade
                            ? 'btn-secondary'
                            : 'btn-secondary text-gray-400'
                      }`}
                    >
                      {isUpgrade ? 'Passer à ce plan' : 'Rétrograder'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-center text-gray-400">
            Pour modifier votre abonnement, contactez-nous à{' '}
            <a href="mailto:support@hanut.tn" className="text-brand-600 hover:underline">
              support@hanut.tn
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
