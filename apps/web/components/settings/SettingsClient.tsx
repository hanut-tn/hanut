'use client'

import { useState, useTransition, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, AlertTriangle, MessageCircle, Clock, Info, Check, X as XIcon, LifeBuoy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ProfileInput, ShopBrandingInput } from '@/app/(dashboard)/settings/actions'
import { uploadProductImage } from '@/app/(dashboard)/catalog/actions'
import { HANUT_CONTACT } from '@/lib/constants'

const PLAN_CONFIG = {
  starter:  { label: 'Starter',  color: 'bg-gray-100 text-gray-700',         price: '39 DT/mois' },
  pro:      { label: 'Pro',      color: 'bg-blue-100 text-blue-700',          price: '79 DT/mois' },
  business: { label: 'Business', color: 'bg-[#0B5E46] text-white',            price: 'Bientôt' },
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
      '100 commandes / mois',
      'Catalogue produits illimité',
      'Lien de commande public /order',
      'Suivi commande client /track',
      'Gestion stock en temps réel',
      'Fiche client',
      'Gestion livraisons COD (5 transporteurs)',
      'Analytics 30 jours',
      'Support WhatsApp',
    ],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '79 DT / mois',
    features: [
      'Commandes illimitées',
      'Analytics 180 jours + comparaison période',
      'Historique mouvements stock',
      'Fiche client CRM (tags et notes)',
      'Export CSV commandes et analytics',
      'Top produits, clients et villes',
      'Équipe jusqu\'à 3 membres',
      'Support prioritaire WhatsApp',
    ],
    recommended: true,
  },
  {
    key: 'business',
    label: 'Business',
    price: '',
    features: [
      'Aperçu : multi-boutiques',
      'Aperçu : équipe illimitée',
      'Aperçu : accès API',
      'Aperçu : rapport fiscal',
    ],
  },
]

type PlanOption = (typeof PLANS)[number]
type UpgradePlanKey = 'pro'
type UpgradePlan = PlanOption & { key: UpgradePlanKey }

function getWhatsAppMessage(plan: UpgradePlanKey, vendorName: string): string {
  const messages = {
    pro: `Bonjour Hanut, je suis ${vendorName} et je voudrais passer au plan Pro (79 DT/mois). Pouvez-vous m'aider ?`,
  }
  return encodeURIComponent(messages[plan])
}

function getWhatsAppUrl(plan: UpgradePlanKey, vendorName: string): string {
  return `${HANUT_CONTACT.whatsappUrl}?text=${getWhatsAppMessage(plan, vendorName)}`
}

type Seller = {
  name: string
  email: string
  phone: string
  plan: 'starter' | 'pro' | 'business'
  subscription_end: string | null
  created_at: string | null
  slug: string | null
  shop_name: string | null
  shop_description: string | null
  banner_url: string | null
}

type Props = {
  seller: Seller
  stats: { products: number; customers: number; orders: number; members: number }
  appUrl: string
  initialTab?: string
  monthlyOrderCount?: number | null
  updateProfile: (input: ProfileInput) => Promise<void>
  updateSlug: (slug: string) => Promise<void>
  updateShopBranding: (input: ShopBrandingInput) => Promise<void>
  checkSlugAvailability: (slug: string) => Promise<boolean>
}

type Tab = 'profile' | 'security' | 'plan' | 'link'
type Msg = { type: 'success' | 'error'; text: string }

const TAB_KEYS: Tab[] = ['profile', 'link', 'security', 'plan']

function getPasswordStrength(pw: string): { level: 'weak' | 'medium' | 'strong'; label: string; color: string } {
  if (pw.length === 0) return { level: 'weak', label: '', color: '' }
  if (pw.length < 8) return { level: 'weak', label: 'Faible', color: 'bg-red-400' }
  const score = [/[A-Z]/.test(pw), /\d/.test(pw), /[^a-zA-Z0-9]/.test(pw), pw.length >= 12].filter(Boolean).length
  if (score >= 3) return { level: 'strong', label: 'Fort', color: 'bg-green-500' }
  if (score >= 1) return { level: 'medium', label: 'Moyen', color: 'bg-amber-400' }
  return { level: 'weak', label: 'Faible', color: 'bg-red-400' }
}

export default function SettingsClient({ seller, stats, appUrl, initialTab, monthlyOrderCount, updateProfile, updateSlug, updateShopBranding, checkSlugAvailability }: Props) {
  const BASE_URL = appUrl.replace(/\/$/, '')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [tab, setTab] = useState<Tab>(TAB_KEYS.includes(initialTab as Tab) ? initialTab as Tab : 'profile')
  const [isPending, startTransition] = useTransition()

  // Profile
  const [name, setName] = useState(seller.name)
  const [phone, setPhone] = useState(seller.phone)
  const [profileMsg, setProfileMsg] = useState<Msg | null>(null)

  // Boutique publique (branding)
  const [shopName, setShopName] = useState(seller.shop_name ?? '')
  const [shopDescription, setShopDescription] = useState(seller.shop_description ?? '')
  const [bannerUrl, setBannerUrl] = useState<string | null>(seller.banner_url)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [brandingMsg, setBrandingMsg] = useState<Msg | null>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  // Email change
  const [newEmail, setNewEmail] = useState(seller.email)
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [emailMsg, setEmailMsg] = useState<Msg | null>(null)
  const [emailPending, setEmailPending] = useState(false)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMsg, setPwMsg] = useState<Msg | null>(null)
  const [pwPending, setPwPending] = useState(false)

  // Logout all
  const [logoutPending, setLogoutPending] = useState(false)

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteEmailInput, setDeleteEmailInput] = useState('')
  const [deletePending, setDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState(false)
  const [upgradePlan, setUpgradePlan] = useState<UpgradePlan | null>(null)

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
  const orderLinkFull = seller.slug ? `${BASE_URL}/s/${seller.slug}` : null
  const orderLink = orderLinkFull ? orderLinkFull.replace(/^https?:\/\//, '') : null
  const pwStrength = getPasswordStrength(newPassword)
  const pendingEmailDisplay = emailSentTo ?? pendingEmail
  const upgradeWhatsappUrl = upgradePlan ? getWhatsAppUrl(upgradePlan.key, seller.name) : null
  const hasTeamAccess = seller.plan !== 'starter'

  useEffect(() => {
    // Check if there is a pending email change already in progress
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user as { new_email?: string } | null
      if (u?.new_email) setPendingEmail(u.new_email)
    })
  }, [supabase])

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

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newEmail.trim()
    if (!trimmed || trimmed === seller.email) return
    setEmailMsg(null)
    setEmailPending(true)
    const response = await fetch('/api/auth/change-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed }),
    }).catch(() => null)
    setEmailPending(false)
    if (!response) {
      setEmailMsg({ type: 'error', text: 'Erreur réseau. Vérifiez votre connexion.' })
    } else if (!response.ok) {
      const data = await response.json().catch(() => ({} as { error?: string }))
      setEmailMsg({ type: 'error', text: data.error ?? "Impossible d'envoyer les emails de confirmation." })
    } else {
      setEmailSentTo(trimmed)
    }
  }

  function handleCancelEmailChange() {
    setPendingEmail(null)
    setEmailSentTo(null)
    setNewEmail(seller.email)
    setEmailMsg({
      type: 'success',
      text: 'Demande masquée. Ignorez les emails de confirmation déjà envoyés si vous ne souhaitez pas changer d’adresse.',
    })
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (!currentPassword) {
      setPwMsg({ type: 'error', text: 'Veuillez saisir votre mot de passe actuel.' })
      return
    }
    if (newPassword.length < 8) {
      setPwMsg({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' })
      return
    }
    if (!/\d/.test(newPassword)) {
      setPwMsg({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 1 chiffre.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
      return
    }
    setPwPending(true)
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: seller.email,
      password: currentPassword,
    })
    if (signInErr) {
      setPwMsg({ type: 'error', text: 'Mot de passe actuel incorrect.' })
      setPwPending(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwPending(false)
    if (error) {
      setPwMsg({ type: 'error', text: error.message })
    } else {
      setPwMsg({ type: 'success', text: 'Mot de passe changé avec succès.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  async function handleLogoutAll() {
    setLogoutPending(true)
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/login')
  }

  async function handleDeleteAccount() {
    setDeleteError(null)
    if (deleteEmailInput !== seller.email) return
    setDeletePending(true)
    const res = await fetch('/api/account', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: deleteEmailInput }),
    })
    const json = await res.json().catch(() => ({ error: 'Réponse serveur invalide.' })) as { error?: string }
    setDeletePending(false)
    if (!res.ok || json.error) {
      setDeleteError(json.error ?? 'Suppression impossible.')
      return
    }
    setDeleteSuccess(true)
    await supabase.auth.signOut()
    setTimeout(() => router.push('/'), 2000)
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

  async function handleBannerFile(file: File) {
    setBrandingMsg(null)
    if (file.size > 5 * 1024 * 1024) {
      setBrandingMsg({ type: 'error', text: "L'image ne doit pas dépasser 5 Mo." })
      return
    }
    setBannerUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { url, error } = await uploadProductImage(fd)
      if (error || !url) throw new Error(error ?? "Échec de l'upload")
      setBannerUrl(url)
    } catch (err) {
      setBrandingMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur inconnue' })
    } finally {
      setBannerUploading(false)
      if (bannerInputRef.current) bannerInputRef.current.value = ''
    }
  }

  function handleBrandingSave(e: React.FormEvent) {
    e.preventDefault()
    setBrandingMsg(null)
    startTransition(async () => {
      try {
        await updateShopBranding({ shopName, shopDescription, bannerUrl })
        setBrandingMsg({ type: 'success', text: 'Boutique mise à jour avec succès.' })
      } catch (err) {
        setBrandingMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur inconnue' })
      }
    })
  }

  function handleSlugSave(e: React.FormEvent) {
    e.preventDefault()
    setSlugMsg(null)
    startTransition(async () => {
      try {
        await updateSlug(newSlug)
        setSlugMsg({ type: 'success', text: 'Lien mis à jour avec succès.' })
        setSlugAvailable(null)
        // Un slug par défaut est déjà généré à l'inscription — cette étape
        // de l'onboarding ne doit se cocher que lorsque le vendeur a
        // explicitement enregistré/confirmé son URL, pas dès la création
        // du compte.
        fetch('/api/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'slug_confirmed' }),
        }).catch(() => {})
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
      fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link_copied' }),
      }).catch(() => {})
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
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Paramètres</h1>

      {/* Profile card */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-xl font-bold shrink-0 select-none">
            {initials || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 text-base sm:text-lg leading-tight truncate">{seller.name}</p>
            <p className="text-sm text-gray-500 truncate">{seller.email}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1.5 ${planCfg.color}`}>
              {planCfg.label}
            </span>
          </div>
        </div>
        <div className={`grid gap-4 pt-4 border-t border-[#E7E5E4] text-center ${hasTeamAccess ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {[
            { label: 'Produits',  val: stats.products  },
            { label: 'Clients',   val: stats.customers },
            { label: 'Commandes', val: stats.orders    },
            ...(hasTeamAccess ? [{ label: 'Membres', val: stats.members }] : []),
          ].map(s => (
            <div key={s.label}>
              <p className="text-xl font-bold text-gray-900">{s.val}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E7E5E4] overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-4 py-3 min-h-[44px] text-sm font-medium transition-colors shrink-0 ${
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
        <div className="space-y-4">
          {/* Email section */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Adresse email</h2>

            {pendingEmailDisplay ? (
              <>
                <div className="flex items-center gap-3">
                  <input className="input flex-1 bg-gray-50 text-gray-500 cursor-not-allowed" value={seller.email} readOnly />
                  <span className="shrink-0 text-xs font-medium px-2 py-1 bg-amber-100 text-amber-700 rounded-full whitespace-nowrap">
                    En attente
                  </span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-sm font-medium text-amber-700">Confirmation requise</p>
                  </div>
                  <p className="text-xs text-amber-600">
                    Un email de confirmation a été envoyé à{' '}
                    <strong>{pendingEmailDisplay}</strong>.{' '}
                    Cliquez sur le lien pour valider votre nouvelle adresse.
                    Votre email actuel reste actif jusqu&apos;à confirmation.
                  </p>
                  <button
                    type="button"
                    onClick={handleCancelEmailChange}
                    className="text-xs text-amber-700 underline mt-2 hover:text-amber-800"
                  >
                    Annuler le changement
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleEmailChange} className="space-y-3">
                <input
                  className="input"
                  type="email"
                  value={newEmail}
                  onChange={e => { setNewEmail(e.target.value); setEmailMsg(null) }}
                  placeholder="vous@exemple.com"
                  required
                  autoComplete="email"
                />
                {emailMsg && (
                  <div className={`rounded-lg px-4 py-3 text-sm ${
                    emailMsg.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {emailMsg.text}
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={emailPending || !newEmail.trim() || newEmail.trim() === seller.email}
                    className="btn-secondary text-sm"
                  >
                    {emailPending ? 'Envoi...' : "Changer l'email"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Name / phone section */}
          <form onSubmit={handleProfileSave} className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Informations personnelles</h2>

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
        </div>
      )}

      {/* ── LIEN COMMANDE ── */}
      {tab === 'link' && (
        <div className="space-y-4">
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
                    className={`inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      copied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {copied ? <><Check className="w-3 h-3" /> Copié !</> : 'Copier'}
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

          <form onSubmit={handleBrandingSave} className="card p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900 mb-0.5">Votre boutique publique</h2>
              <p className="text-sm text-gray-500">
                Personnalisez ce que vos clients voient en haut de votre boutique.
              </p>
            </div>

            <div>
              <label htmlFor="shop-name" className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la boutique
              </label>
              <input
                id="shop-name"
                className="input"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                placeholder={seller.name || 'Ma boutique'}
                maxLength={100}
              />
              <p className="text-xs text-gray-400 mt-1">
                Laissez vide pour afficher le nom de votre compte ({seller.name}).
              </p>
            </div>

            <div>
              <label htmlFor="shop-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <textarea
                id="shop-description"
                className="input resize-none"
                rows={2}
                value={shopDescription}
                onChange={e => setShopDescription(e.target.value)}
                placeholder="Ex: Parfums et cosmétiques — livraison partout en Tunisie"
                maxLength={300}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image bannière <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              {bannerUrl ? (
                <div className="space-y-2">
                  <div
                    role="img"
                    aria-label="Aperçu de la bannière"
                    className="h-24 w-full rounded-xl border border-gray-200 bg-cover bg-center"
                    style={{ backgroundImage: `url(${bannerUrl})` }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={bannerUploading}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {bannerUploading ? 'Envoi…' : "Changer l'image"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerUrl(null)}
                      disabled={bannerUploading}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={bannerUploading}
                  className="w-full h-20 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-brand-500/50 hover:text-brand-600 transition-colors disabled:opacity-50"
                >
                  {bannerUploading ? 'Envoi en cours…' : 'Choisir une image — 1200×300px conseillé'}
                </button>
              )}
              <input
                ref={bannerInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleBannerFile(f) }}
              />
              <p className="text-xs text-gray-400 mt-1">
                Sans image, votre boutique affiche un fond vert Hanut par défaut.
              </p>
            </div>

            {brandingMsg && (
              <div className={`rounded-lg px-4 py-3 text-sm ${
                brandingMsg.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {brandingMsg.text}
              </div>
            )}

            <div className="flex justify-end gap-2">
              {orderLinkFull && (
                <a
                  href={orderLinkFull}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Voir ma boutique
                </a>
              )}
              <button type="submit" disabled={isPending || bannerUploading} className="btn-primary">
                {isPending ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </form>

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
                  hanut.tn/s/
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
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-green-600 font-semibold">
                      <Check className="w-3 h-3" /> Disponible
                    </span>
                  )}
                  {!slugChecking && slugAvailable === false && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-red-500 font-semibold">
                      <XIcon className="w-3 h-3" /> Pris
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel *</label>
              <input
                className="input"
                type="password"
                value={currentPassword}
                onChange={e => { setCurrentPassword(e.target.value); setPwMsg(null) }}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe *</label>
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPwMsg(null) }}
                placeholder="Minimum 8 caractères, 1 chiffre"
                required
                autoComplete="new-password"
              />
              {newPassword.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {(['weak', 'medium', 'strong'] as const).map((level, i) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          (['weak', 'medium', 'strong'] as const).indexOf(pwStrength.level) >= i && pwStrength.color
                            ? pwStrength.color
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  {pwStrength.label && (
                    <span className={`text-xs font-medium ${
                      pwStrength.level === 'strong' ? 'text-green-600' :
                      pwStrength.level === 'medium' ? 'text-amber-600' : 'text-red-500'
                    }`}>
                      {pwStrength.label}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe *</label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPwMsg(null) }}
                placeholder="Répéter le mot de passe"
                required
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>
              )}
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
              <button
                type="submit"
                disabled={pwPending || !currentPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                className="btn-primary"
              >
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

          {/* Données et confidentialité */}
          <div className="card p-5 space-y-2">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-[#78716C] mt-0.5 shrink-0" />
              <div>
                <h2 className="font-semibold text-gray-900 mb-1">Données et confidentialité</h2>
                <p className="text-sm text-[#78716C]">
                  Vos données sont traitées conformément à la{' '}
                  <a href="/privacy" className="text-[#16A34A] hover:underline font-medium">
                    loi organique n° 2004-63
                  </a>.
                  {' '}La suppression de votre compte efface définitivement toutes vos données personnelles
                  et celles de votre boutique.
                </p>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="card p-5 ring-1 ring-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <h2 className="font-semibold text-red-700">Zone de danger</h2>
            </div>
            <p className="text-sm text-gray-700 mb-1 font-medium">Supprimer mon compte</p>
            <p className="text-xs text-gray-400 mb-4">
              Cette action est irréversible. Toutes vos données (commandes, clients, produits) seront supprimées définitivement.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50"
            >
              Supprimer mon compte
            </button>
          </div>
        </div>
      )}

      {/* ── ABONNEMENT ── */}
      {tab === 'plan' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-700">
                Paiement en cours d&apos;intégration
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Pour l&apos;instant les upgrades se font via WhatsApp.
                Activation sous 24h garantie.
              </p>
            </div>
          </div>

          <div className="card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Abonnement actuel</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-sm font-semibold ${planCfg.color}`}>
                  {planCfg.label}
                </span>
                <span className="text-gray-500 text-sm">— {planCfg.price}</span>
              </div>
              {seller.plan === 'starter' && monthlyOrderCount !== null && monthlyOrderCount !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 w-32 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${monthlyOrderCount >= 100 ? 'bg-red-500' : monthlyOrderCount >= 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(100, (monthlyOrderCount / 100) * 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${monthlyOrderCount >= 100 ? 'text-red-600' : 'text-gray-500'}`}>
                    {monthlyOrderCount} / 100 commandes ce mois
                  </span>
                </div>
              )}
              {seller.plan === 'pro' && (
                <p className="text-xs text-green-600 font-medium mt-1">Commandes illimitées</p>
              )}
            </div>
            {seller.subscription_end && (
              <div className="sm:text-right">
                <p className="text-xs text-gray-400">Renouvellement le</p>
                <p className="text-sm font-medium text-gray-700">
                  {new Date(seller.subscription_end).toLocaleDateString('fr-TN', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {PLANS.map(plan => {
              const isCurrent = plan.key === seller.plan
              const isBusiness = plan.key === 'business'
              const isPaidPlan = plan.key === 'pro'
              const whatsappPlan = isPaidPlan ? plan as UpgradePlan : null

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
                    {plan.price ? (
                      <p className={`font-semibold text-lg mt-0.5 ${plan.recommended ? 'text-brand-600' : 'text-gray-800'}`}>
                        {plan.price}
                      </p>
                    ) : (
                      <p className="font-semibold text-sm mt-1 text-gray-500">Bientôt disponible</p>
                    )}
                  </div>
                  <ul className="space-y-1.5 flex-1 mb-4">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-1.5 text-sm text-gray-600">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className="w-full text-center py-2.5 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed text-sm font-medium">
                      Plan actuel
                    </div>
                  ) : isBusiness ? (
                    <div className="w-full text-center py-2.5 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed text-sm font-medium">
                      Bientôt disponible
                    </div>
                  ) : whatsappPlan ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setUpgradePlan(whatsappPlan)}
                        className={`w-full min-h-[56px] rounded-lg px-3 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                          whatsappPlan.key === 'pro'
                            ? 'bg-[#16A34A] hover:bg-[#15803D] text-white'
                            : 'bg-[#0B5E46] hover:bg-[#0a5240] text-white'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4 shrink-0" />
                        <span className="min-w-0 text-center leading-tight">
                          <span className="block whitespace-nowrap">Passer au plan {whatsappPlan.label}</span>
                          {whatsappPlan.price && (
                            <span className="block text-xs font-normal opacity-90">{whatsappPlan.price.replace(' / ', '/')}</span>
                          )}
                        </span>
                      </button>
                      <p className="text-xs text-[#78716C] text-center mt-3 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        Activation sous 24h · Paiement par virement ou en main propre
                      </p>
                    </>
                  ) : (
                    <div className="w-full text-center py-2.5 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed text-sm font-medium">
                      Plan inférieur
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="card p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#F0FDF4] text-[#166534] rounded-xl flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Gestion de l&apos;équipe</p>
                <p className="text-sm text-gray-500">
                  {hasTeamAccess
                    ? 'Invitez des collaborateurs avec des rôles personnalisés'
                    : 'Disponible dans le plan Pro — invitez jusqu\'à 3 collaborateurs'}
                </p>
              </div>
            </div>
            {hasTeamAccess ? (
              <a
                href="/team"
                className="btn-secondary w-full text-center text-sm whitespace-nowrap sm:w-auto"
              >
                Gérer l&apos;équipe →
              </a>
            ) : (
              <span className="inline-flex w-full items-center justify-center px-3 py-1.5 rounded-lg bg-[#F0FDF4] text-[#166534] border border-green-200 text-xs font-medium whitespace-nowrap sm:w-auto">
                Plan Pro requis
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── MODALE UPGRADE WHATSAPP ── */}
      {upgradePlan && upgradeWhatsappUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-5">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                Passer au plan {upgradePlan.label}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Vous allez être redirigé vers WhatsApp pour finaliser votre upgrade.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Ce que vous obtenez :</p>
              <ul className="space-y-2">
                {upgradePlan.features.map(feature => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] p-4 space-y-1">
              <p className="text-sm text-gray-700">
                Prix : <span className="font-semibold text-gray-900">{upgradePlan.price.replace(' / ', '/')}</span>
              </p>
              <p className="text-sm text-gray-700">
                Activation : <span className="font-semibold text-gray-900">sous 24h après paiement</span>
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setUpgradePlan(null)}
                className="btn-secondary w-full sm:w-auto"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!upgradePlan) return
                  const url = getWhatsAppUrl(upgradePlan.key, seller.name)
                  const popup = window.open('', '_blank', 'noopener,noreferrer')
                  await fetch('/api/upgrade-requests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requested_plan: upgradePlan.key }),
                  }).catch(() => {})
                  if (popup) {
                    popup.location.href = url
                  } else {
                    window.open(url, '_blank', 'noopener,noreferrer')
                  }
                  setUpgradePlan(null)
                }}
                className="w-full sm:w-auto bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" />
                Continuer sur WhatsApp →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE SUPPRESSION ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-5">
            {deleteSuccess ? (
              <div className="text-center py-4 space-y-3">
                <p className="font-semibold text-gray-900 text-lg">Compte supprimé</p>
                <p className="text-sm text-gray-500">Redirection en cours...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="font-semibold text-gray-900 text-lg leading-tight">
                    Supprimer définitivement votre compte ?
                  </h2>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 space-y-1">
                  <p className="font-medium mb-2">Cette action supprimera :</p>
                  <p>• {stats.orders} commande{stats.orders !== 1 ? 's' : ''}</p>
                  <p>• {stats.customers} client{stats.customers !== 1 ? 's' : ''}</p>
                  <p>• {stats.products} produit{stats.products !== 1 ? 's' : ''}</p>
                  <p>• Tous vos membres d&apos;équipe</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tapez votre email pour confirmer
                  </label>
                  <input
                    className="input"
                    type="email"
                    value={deleteEmailInput}
                    onChange={e => { setDeleteEmailInput(e.target.value); setDeleteError(null) }}
                    placeholder={seller.email}
                    autoComplete="off"
                  />
                </div>

                {deleteError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {deleteError}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowDeleteModal(false); setDeleteEmailInput(''); setDeleteError(null) }}
                    className="btn-secondary flex-1"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteEmailInput !== seller.email || deletePending}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-all duration-150 ease-out hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-red-600/40 active:scale-[0.97] disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:ring-0 disabled:active:scale-100"
                  >
                    {deletePending ? 'Suppression...' : 'Supprimer définitivement'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Aide — toujours visible, quel que soit l'onglet actif */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          <LifeBuoy className="w-5 h-5 text-brand-600" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">Besoin d&apos;aide ?</p>
          <p className="text-sm text-gray-500">
            Pour toute question :{' '}
            <a href={`mailto:${HANUT_CONTACT.supportEmail}`} className="text-brand-600 font-medium hover:underline">
              {HANUT_CONTACT.supportEmail}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
