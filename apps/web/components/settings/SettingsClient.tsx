'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ProfileInput } from '@/app/(dashboard)/settings/actions'

const PLAN_CONFIG = {
  starter:  { label: 'Starter',  color: 'bg-gray-100 text-gray-700',         price: '39 DT/mois' },
  pro:      { label: 'Pro',      color: 'bg-blue-100 text-blue-700',          price: '79 DT/mois' },
  business: { label: 'Business', color: 'bg-[#0B5E46] text-white',            price: '149 DT/mois' },
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
    price: '39 DT / mois',
    features: [
      '150 commandes / mois',
      '1 utilisateur',
      '5 livreurs',
      '200 SMS / mois',
      'Lien de commande public',
      'Support email',
    ],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '79 DT / mois',
    features: [
      'Commandes illimitées',
      '2 utilisateurs',
      '15+ livreurs',
      'SMS illimités',
      'Analytics avancés',
      'Export CSV',
      'Support WhatsApp prioritaire',
    ],
    recommended: true,
  },
  {
    key: 'business',
    label: 'Business',
    price: '149 DT / mois',
    features: [
      'Tout Pro inclus',
      '5 utilisateurs',
      'Multi-boutiques',
      'Accès API',
      'Rapport fiscal',
      'Support dédié',
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
  slug: string | null
}

type Props = {
  seller: Seller
  stats: { products: number; customers: number; orders: number; members: number }
  appUrl: string
  initialTab?: string
  updateProfile: (input: ProfileInput) => Promise<void>
  updateSlug: (slug: string) => Promise<void>
  checkSlugAvailability: (slug: string) => Promise<boolean>
}

type Tab = 'profile' | 'security' | 'plan' | 'link'
type Msg = { type: 'success' | 'error'; text: string }

const TAB_KEYS: Tab[] = ['profile', 'link', 'security', 'plan']

export default function SettingsClient({ seller, stats, appUrl, initialTab, updateProfile, updateSlug, checkSlugAvailability }: Props) {
  const BASE_URL = appUrl.replace(/\/$/, '')
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>(TAB_KEYS.includes(initialTab as Tab) ? initialTab as Tab : 'profile')
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

  // Link / slug
  const [newSlug, setNewSlug] = useState(seller.slug ?? '')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugMsg, setSlugMsg] = useState<Msg | null>(null)
  const [copied, setCopied] = useState(false)
  const slugTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initials = seller.name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const planCfg = PLAN_CONFIG[seller.plan]
  const orderLinkFull = seller.slug ? `${BASE_URL}/order/${seller.slug}` : null
  const orderLink = orderLinkFull ? orderLinkFull.replace(/^https?:\/\//, '') : null

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

  function onSlugChange(value: string) {
    setNewSlug(value)
    setSlugAvailable(null)
    setSlugMsg(null)
    if (slugTimeout.current) clearTimeout(slugTimeout.current)
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
    if (cleaned.length >= 3) {
      setSlugChecking(true)
      slugTimeout.current = setTimeout(async () => {
        const available = await checkSlugAvailability(cleaned)
        setSlugAvailable(available)
        setSlugChecking(false)
      }, 500)
    }
  }

  function handleSlugSave(e: React.FormEvent) {
    e.preventDefault()
    setSlugMsg(null)
    startTransition(async () => {
      try {
        await updateSlug(newSlug)
        setSlugMsg({ type: 'success', text: 'Lien mis à jour avec succès.' })
        setSlugAvailable(null)
      } catch (err) {
        setSlugMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur inconnue' })
      }
    })
  }

  function handleCopy() {
    if (!orderLinkFull) return
    navigator.clipboard.writeText(orderLinkFull).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'profile',  label: 'Profil' },
    { key: 'link',     label: 'Lien commande' },
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
          {[
            { label: 'Produits',   val: stats.products },
            { label: 'Clients',    val: stats.customers },
            { label: 'Commandes',  val: stats.orders },
            ...(seller.plan === 'business' ? [{ label: 'Membres', val: stats.members }] : []),
          ].map(s => (
            <div key={s.label}>
              <p className="text-xl font-bold text-gray-900">{s.val}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E7E5E4]">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'text-[#166534] border-b-2 border-[#16A34A] -mb-px'
                : 'text-[#78716C] hover:text-[#1C1917]'
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
            <input className="input bg-gray-50 text-gray-400 cursor-not-allowed" value={seller.email} readOnly />
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

      {/* ── LIEN COMMANDE ── */}
      {tab === 'link' && (
        <div className="space-y-4">
          {/* Current link card */}
          <div className="card p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 mb-0.5">Votre lien de commande</h2>
              <p className="text-sm text-gray-500">
                Partagez ce lien dans votre bio Instagram, statut WhatsApp ou description TikTok.
                Vos clients pourront passer commande directement depuis leur téléphone.
              </p>
            </div>

            {orderLink ? (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">Votre lien</p>
                  <p className="text-sm font-mono font-medium text-gray-900 truncate">{orderLink}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleCopy}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      copied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {copied ? '✓ Copié !' : 'Copier'}
                  </button>
                  <a
                    href={orderLinkFull!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                  >
                    Voir ma page
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700">
                Vous n&apos;avez pas encore de lien de commande. Créez-en un ci-dessous.
              </div>
            )}
          </div>

          {/* Edit slug */}
          <form onSubmit={handleSlugSave} className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">
              {seller.slug ? 'Modifier votre lien' : 'Créer votre lien'}
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Identifiant de boutique
              </label>
              <div className="flex items-center gap-0">
                <span className="px-3 py-2.5 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-500 shrink-0 font-mono">
                  hanut.tn/order/
                </span>
                <div className="relative flex-1">
                  <input
                    className={`input rounded-l-none border-l-0 font-mono ${
                      slugAvailable === true ? 'border-green-300 focus:ring-green-100' :
                      slugAvailable === false ? 'border-red-300 focus:ring-red-100' : ''
                    }`}
                    value={newSlug}
                    onChange={e => onSlugChange(e.target.value)}
                    placeholder="ma-boutique"
                    required
                    minLength={3}
                    maxLength={50}
                  />
                  {slugChecking && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      Vérification…
                    </span>
                  )}
                  {!slugChecking && slugAvailable === true && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-semibold">
                      ✓ Disponible
                    </span>
                  )}
                  {!slugChecking && slugAvailable === false && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-500 font-semibold">
                      ✗ Pris
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Uniquement lettres, chiffres et tirets. Exemple : <span className="font-mono">boutique-rania</span>
              </p>
            </div>

            {slugMsg && (
              <div className={`rounded-lg px-4 py-3 text-sm ${
                slugMsg.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {slugMsg.text}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending || slugAvailable === false}
                className="btn-primary"
              >
                {isPending ? 'Sauvegarde...' : seller.slug ? 'Mettre à jour' : 'Créer le lien'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── SÉCURITÉ ── */}
      {tab === 'security' && (
        <div className="space-y-4">
          <form onSubmit={handlePasswordChange} className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Changer le mot de passe</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
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
            <a href="mailto:hanut.tn@gmail.com" className="text-brand-600 hover:underline">
              hanut.tn@gmail.com
            </a>
          </p>

          {/* Gestion d'équipe */}
          <div className="card p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#F0FDF4] text-[#166534] rounded-xl flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Gestion de l&apos;équipe</p>
                <p className="text-sm text-gray-500">
                  {seller.plan === 'business'
                    ? 'Invitez des collaborateurs avec des rôles personnalisés'
                    : 'Disponible dans le plan Business — invitez jusqu\'à 4 collaborateurs'}
                </p>
              </div>
            </div>
            {seller.plan === 'business' ? (
              <a
                href="/team"
                className="btn-secondary text-sm whitespace-nowrap"
              >
                Gérer l&apos;équipe →
              </a>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#F0FDF4] text-[#166534] border border-green-200 text-xs font-medium whitespace-nowrap">
                Plan Business requis
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
