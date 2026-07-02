'use client'

import { Fragment, useState, useTransition } from 'react'
import { UserCheck, UserPlus, Users2, ShoppingBag, Package, User, Truck, ClipboardList, AlertCircle, AlertTriangle, Check, Banknote } from 'lucide-react'
import type { TeamMember, ActivityLog } from '@/app/(dashboard)/team/page'

const MAX_MEMBERS_BY_PLAN: Record<string, number> = {
  pro: 3,
  business: Infinity,
}

const ROLE_CONFIG = {
  admin:    { label: 'Admin',         cls: 'bg-[#F0FDF4] text-[#166534]' },
  operator: { label: 'Opérateur',     cls: 'bg-blue-50 text-blue-700' },
  readonly: { label: 'Lecture seule', cls: 'bg-gray-50 text-gray-700' },
}

const STATUS_CONFIG = {
  active:  { label: 'Actif',      cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  pending: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
}

const ACTION_ICONS: Record<string, { Icon: React.ElementType; cls: string; group: string }> = {
  order_created:        { Icon: ShoppingBag, cls: 'text-blue-600',   group: 'Commandes' },
  order_confirmed:      { Icon: ShoppingBag, cls: 'text-blue-600',   group: 'Commandes' },
  order_status_changed: { Icon: ShoppingBag, cls: 'text-blue-600',   group: 'Commandes' },
  order_deleted:        { Icon: ShoppingBag, cls: 'text-blue-600',   group: 'Commandes' },
  product_created:      { Icon: Package,     cls: 'text-orange-600', group: 'Produits' },
  product_updated:      { Icon: Package,     cls: 'text-orange-600', group: 'Produits' },
  product_deleted:      { Icon: Package,     cls: 'text-orange-600', group: 'Produits' },
  customer_updated:     { Icon: User,        cls: 'text-[#78716C]', group: 'Clients' },
  delivery_created:     { Icon: Truck,       cls: 'text-green-600',  group: 'Livraisons' },
  delivery_cod_reversed:{ Icon: Banknote,    cls: 'text-green-600',  group: 'Livraisons' },
  member_invited:       { Icon: Users2,      cls: 'text-red-600',    group: 'Équipe' },
  member_removed:       { Icon: Users2,      cls: 'text-red-600',    group: 'Équipe' },
  member_role_changed:  { Icon: Users2,      cls: 'text-red-600',    group: 'Équipe' },
}

const ACTION_GROUPS = ['Commandes', 'Produits', 'Clients', 'Livraisons', 'Équipe']

type Props = {
  sellerId: string
  currentUserId: string
  plan?: string
  members: TeamMember[]
  initialLogs: ActivityLog[]
  initialTotal: number
}

export default function TeamPageClient({ currentUserId, plan, members: initialMembers, initialLogs, initialTotal }: Props) {
  const MAX_MEMBERS = MAX_MEMBERS_BY_PLAN[plan ?? 'pro'] ?? 3
  const [members, setMembers] = useState(initialMembers)
  const [isPending, startTransition] = useTransition()

  // Invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'operator' | 'readonly'>('operator')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  // Delete modal
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Role change
  const [roleError, setRoleError] = useState<string | null>(null)

  // Resend invitation per-member feedback
  const [resentMembers, setResentMembers] = useState<Set<string>>(new Set())

  // Activity filters
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs)
  const [totalLogs, setTotalLogs] = useState(initialTotal)
  const [logOffset, setLogOffset] = useState(initialLogs.length)
  const [hasMore, setHasMore] = useState(initialLogs.length < initialTotal)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filterUserId, setFilterUserId] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [filterDays, setFilterDays] = useState(0)
  const [filtering, setFiltering] = useState(false)

  const activeCount = members.filter(m => m.status === 'active').length
  const pendingCount = members.filter(m => m.status === 'pending').length
  const spotsLeft = MAX_MEMBERS - members.length

  function initials(m: TeamMember) {
    const n = m.name ?? m.email
    return n.split(/[\s@]/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  function expiryInfo(expires_at?: string | null): { label: string; urgent: boolean; expired: boolean } {
    if (!expires_at) return { label: '', urgent: false, expired: false }
    const diff = new Date(expires_at).getTime() - Date.now()
    if (diff <= 0) return { label: 'Expirée', urgent: true, expired: true }
    const hours = Math.ceil(diff / 3600000)
    if (hours <= 24) return { label: `Expire dans ${hours}h`, urgent: true, expired: false }
    return { label: `Expire le ${formatDate(expires_at)}`, urgent: false, expired: false }
  }

  function formatRelative(iso: string | null) {
    if (!iso) return 'Jamais connecté'
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return "À l'instant"
    if (min < 60) return `Il y a ${min} min`
    const h = Math.floor(min / 60)
    if (h < 24) return `Il y a ${h}h`
    const d = Math.floor(h / 24)
    if (d === 1) return 'Hier'
    if (d < 7) return `Il y a ${d} jours`
    return new Date(iso).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(false)
    startTransition(async () => {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) { setInviteError(data.error ?? 'Erreur'); return }
      setInviteSuccess(true)
      setInviteEmail('')
      const r = await fetch('/api/team')
      const d = await r.json()
      if (d.members) setMembers(d.members)
      setTimeout(() => setInviteSuccess(false), 4000)
    })
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    setRoleError(null)
    const res = await fetch(`/api/team/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    const data = await res.json()
    if (!res.ok) { setRoleError(data.error ?? 'Erreur'); return }
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole as TeamMember['role'] } : m))
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleteError(null)
    startTransition(async () => {
      const res = await fetch(`/api/team/${confirmDelete.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setDeleteError(data.error ?? 'Erreur'); return }
      setMembers(prev => prev.filter(m => m.id !== confirmDelete.id))
      setConfirmDelete(null)
    })
  }

  async function handleResendInvite(memberId: string) {
    setRoleError(null)
    const res = await fetch(`/api/team/${memberId}/resend`, { method: 'POST' })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setRoleError(data?.error ?? "Impossible de renvoyer l'invitation")
      return
    }
    setMembers(prev => prev.map(m => m.id === memberId
      ? {
          ...m,
          invited_at: typeof data?.invited_at === 'string' ? data.invited_at : m.invited_at,
          expires_at: typeof data?.expires_at === 'string' ? data.expires_at : m.expires_at,
        }
      : m
    ))
    setResentMembers(prev => new Set([...prev, memberId]))
    setTimeout(() => {
      setResentMembers(prev => {
        const next = new Set(prev)
        next.delete(memberId)
        return next
      })
    }, 3000)
  }

  async function applyLogFilters(params: { userId?: string; group?: string; days?: number; offset?: number; append?: boolean }) {
    const uid = params.userId ?? filterUserId
    const grp = params.group ?? filterGroup
    const d = params.days ?? filterDays
    const off = params.offset ?? 0
    const append = params.append ?? false

    // Map group label → action_types
    const groupActionTypes: Record<string, string[]> = {
      'Commandes':  ['order_created', 'order_confirmed', 'order_status_changed', 'order_deleted'],
      'Produits':   ['product_created', 'product_updated', 'product_deleted'],
      'Clients':    ['customer_updated'],
      'Livraisons': ['delivery_created', 'delivery_cod_reversed'],
      'Équipe':     ['member_invited', 'member_removed', 'member_role_changed'],
    }

    const searchParams = new URLSearchParams()
    searchParams.set('limit', '20')
    searchParams.set('offset', String(off))
    if (uid) searchParams.set('userId', uid)
    if (grp && groupActionTypes[grp]) searchParams.set('actionTypes', groupActionTypes[grp].join(','))
    if (d > 0) searchParams.set('days', String(d))

    setFiltering(!append)
    setLoadingMore(append)

    const res = await fetch(`/api/activity?${searchParams.toString()}`)
    const data = await res.json()

    const nextTotal = typeof data.total === 'number' ? data.total : totalLogs
    setTotalLogs(nextTotal)
    const fetched = (data.logs ?? []) as ActivityLog[]
    const nextOffset = off + fetched.length

    if (append) {
      setLogs(prev => [...prev, ...fetched])
    } else {
      setLogs(fetched)
    }
    setHasMore(nextOffset < nextTotal)
    setLogOffset(nextOffset)
    setFiltering(false)
    setLoadingMore(false)
  }

  function handleFilterChange(key: 'userId' | 'group' | 'days', value: string | number) {
    const updates = {
      userId: key === 'userId' ? String(value) : filterUserId,
      group: key === 'group' ? String(value) : filterGroup,
      days: key === 'days' ? Number(value) : filterDays,
    }
    if (key === 'userId') setFilterUserId(String(value))
    if (key === 'group') setFilterGroup(String(value))
    if (key === 'days') setFilterDays(Number(value))
    applyLogFilters({ userId: updates.userId, group: updates.group, days: updates.days })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Équipe</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gérez vos collaborateurs et consultez leur activité</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: 'Membres actifs', value: activeCount,     Icon: UserCheck,  color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'En attente', value: pendingCount, Icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Capacité', value: `${members.length}/${MAX_MEMBERS}`, Icon: Users2, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(stat => (
          <div key={stat.label} className="card p-2 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <div className={`w-7 h-7 rounded-lg sm:w-10 sm:h-10 sm:rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
              <stat.Icon className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 leading-tight">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {roleError && (
        <div className="rounded-lg px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700">{roleError}</div>
      )}

      {/* Table membres */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Membres</h2>
        </div>

        {members.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Users2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun membre. Invitez votre premier collaborateur ci-dessous.</p>
          </div>
        ) : (
          <>
            {/* ── Cards mobiles (< md) ── */}
            <div className="md:hidden divide-y divide-gray-100">
              {members.map(m => {
                const roleConf  = ROLE_CONFIG[m.role]
                const statusConf = STATUS_CONFIG[m.status]
                const isSelf    = m.user_id === currentUserId
                const hasPending = m.status === 'pending' && !isSelf
                const expiry    = expiryInfo(m.expires_at)

                return (
                  <div key={m.id} className="px-4 py-4 space-y-3">
                    {/* Ligne principale : avatar + infos + retirer */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-[#F0FDF4] text-[#166534] rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {initials(m)}
                      </div>
                      <div className="flex-1 min-w-0">
                        {m.name && <p className="font-medium text-gray-900 text-sm">{m.name}</p>}
                        <p className={`text-sm truncate ${m.name ? 'text-xs text-gray-400' : 'text-gray-700'}`}>{m.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Invité le {formatDate(m.invited_at)}</p>
                      </div>
                      {!isSelf && (
                        <button
                          onClick={() => { setConfirmDelete(m); setDeleteError(null) }}
                          className="text-xs text-red-400 hover:text-red-600 font-medium shrink-0 mt-0.5 min-h-[44px] flex items-start pt-0.5"
                        >
                          Retirer
                        </button>
                      )}
                    </div>

                    {/* Rôle + statut + dernière connexion */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isSelf ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${roleConf.cls}`}>
                          {roleConf.label}
                        </span>
                      ) : (
                        <select
                          defaultValue={m.role}
                          onChange={e => handleRoleChange(m.id, e.target.value)}
                          className="text-base md:text-xs font-medium border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
                        >
                          <option value="operator">Opérateur</option>
                          <option value="readonly">Lecture seule</option>
                        </select>
                      )}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConf.cls}`}>
                        {m.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                        {expiry.expired ? 'Expirée' : statusConf.label}
                      </span>
                      {m.status === 'active' && (
                        <span className="text-xs text-gray-400">{formatRelative(m.last_sign_in_at ?? null)}</span>
                      )}
                    </div>

                    {/* Bannière invitation pending */}
                    {hasPending && (
                      <div className={`border rounded-lg px-3 py-2.5 space-y-2 ${expiry.expired ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                        <p className={`text-xs ${expiry.expired ? 'text-red-700' : expiry.urgent ? 'text-red-600' : 'text-amber-700'}`}>
                          <span className="inline-flex items-center gap-1">
                            {expiry.expired
                              ? <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                              : <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                            Invitation en attente{expiry.label ? ` — ${expiry.label}` : ''}
                          </span>
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {resentMembers.has(m.id) ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                              <Check className="w-3 h-3" /> Invitation renvoyée
                            </span>
                          ) : (
                            <button
                              onClick={() => handleResendInvite(m.id)}
                              className="bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors min-h-[44px]"
                            >
                              Renvoyer l&apos;invitation
                            </button>
                          )}
                          {!expiry.expired && (
                            <button
                              onClick={() => { setConfirmDelete(m); setDeleteError(null) }}
                              className="border border-amber-300 text-amber-700 text-xs px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors min-h-[44px]"
                            >
                              Annuler l&apos;invitation
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Tableau desktop (≥ md) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Membre', 'Rôle', 'Statut', 'Dernière connexion', 'Invité le', ''].map((h, i) => (
                      <th key={i} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map(m => {
                    const roleConf   = ROLE_CONFIG[m.role]
                    const statusConf = STATUS_CONFIG[m.status]
                    const isSelf     = m.user_id === currentUserId
                    const hasPendingBanner = m.status === 'pending' && !isSelf
                    const expiry     = expiryInfo(m.expires_at)

                    return (
                      <Fragment key={m.id}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#F0FDF4] text-[#166534] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                                {initials(m)}
                              </div>
                              <div>
                                {m.name && <p className="font-medium text-gray-900">{m.name}</p>}
                                <p className={m.name ? 'text-xs text-gray-400' : 'text-sm text-gray-700'}>{m.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {isSelf ? (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${roleConf.cls}`}>
                                {roleConf.label}
                              </span>
                            ) : (
                              <select
                                defaultValue={m.role}
                                onChange={e => handleRoleChange(m.id, e.target.value)}
                                className="text-xs font-medium border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                              >
                                <option value="operator">Opérateur</option>
                                <option value="readonly">Lecture seule</option>
                              </select>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${expiry.expired ? 'bg-red-50 text-red-600 border border-red-200' : statusConf.cls}`}>
                              {m.status === 'pending' && !expiry.expired && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                              {expiry.expired ? 'Expirée' : statusConf.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-500">
                            {m.status === 'active' ? formatRelative(m.last_sign_in_at ?? null) : '—'}
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-400">{formatDate(m.invited_at)}</td>
                          <td className="px-5 py-4">
                            {!isSelf && (
                              <button
                                onClick={() => { setConfirmDelete(m); setDeleteError(null) }}
                                className="text-xs text-red-400 hover:text-red-600 font-medium"
                              >
                                Retirer
                              </button>
                            )}
                          </td>
                        </tr>

                        {hasPendingBanner && (
                          <tr className="!border-t-0">
                            <td colSpan={6} className="p-0">
                              <div className={`border-t px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap ${expiry.expired ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                                <span className={`text-xs ${expiry.expired ? 'text-red-700' : expiry.urgent ? 'text-red-600' : 'text-amber-700'}`}>
                                  <span className="inline-flex items-center gap-1">
                                    {expiry.expired
                                      ? <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                                      : <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                                    Invitation en attente{expiry.label ? ` — ${expiry.label}` : ''}
                                  </span>
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  {resentMembers.has(m.id) ? (
                                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                                      <Check className="w-3 h-3" /> Invitation renvoyée
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleResendInvite(m.id)}
                                      className="bg-amber-500 text-white text-xs px-3 py-1 rounded-lg hover:bg-amber-600 transition-colors"
                                    >
                                      Renvoyer l&apos;invitation
                                    </button>
                                  )}
                                  {!expiry.expired && (
                                    <button
                                      onClick={() => { setConfirmDelete(m); setDeleteError(null) }}
                                      className="border border-amber-300 text-amber-700 text-xs px-3 py-1 rounded-lg hover:bg-amber-100 transition-colors"
                                    >
                                      Annuler l&apos;invitation
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Inviter */}
      <div className="card p-4 sm:p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Inviter un collaborateur</h2>

        {spotsLeft <= 0 ? (
          <div className="rounded-lg px-4 py-3 text-sm bg-orange-50 border border-orange-200 text-orange-700">
            Limite de {MAX_MEMBERS} membres atteinte. Retirez un membre pour en inviter un nouveau.
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                className="input sm:flex-1"
                placeholder="email@exemple.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                required
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'operator' | 'readonly')}
                className="input w-full sm:w-44"
              >
                <option value="operator">Opérateur</option>
                <option value="readonly">Lecture seule</option>
              </select>
              <button
                type="submit"
                disabled={isPending || !inviteEmail}
                className="btn-primary w-full whitespace-nowrap sm:w-auto"
              >
                {isPending ? 'Envoi...' : "Envoyer l'invitation"}
              </button>
            </div>

            {inviteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{inviteError}</p>
            )}
            {inviteSuccess && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Invitation envoyée ! Votre collaborateur recevra un email pour créer son compte.
              </p>
            )}

            <div className="text-xs text-gray-400 space-y-0.5">
              <p><span className="font-medium text-gray-600">Opérateur</span> — Peut gérer les commandes, le catalogue et les livraisons</p>
              <p><span className="font-medium text-gray-600">Lecture seule</span> — Peut consulter les commandes, clients et analytiques</p>
            </div>
          </form>
        )}
      </div>

      {/* Journal d'activité */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-gray-900 flex-1">Journal d&apos;activité</h2>

          {/* Filtre membre */}
          <select
            value={filterUserId}
            onChange={e => handleFilterChange('userId', e.target.value)}
            className="w-full text-base md:text-xs border border-gray-200 rounded-lg px-2 py-2 md:py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 sm:w-auto min-h-[44px] md:min-h-0"
          >
            <option value="">Tous les membres</option>
            {members.filter(m => m.user_id).map(m => (
              <option key={m.id} value={m.user_id!}>{m.name ?? m.email}</option>
            ))}
          </select>

          {/* Filtre action */}
          <select
            value={filterGroup}
            onChange={e => handleFilterChange('group', e.target.value)}
            className="w-full text-base md:text-xs border border-gray-200 rounded-lg px-2 py-2 md:py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 sm:w-auto min-h-[44px] md:min-h-0"
          >
            <option value="">Toutes les actions</option>
            {ACTION_GROUPS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {/* Filtre date */}
          <select
            value={filterDays}
            onChange={e => handleFilterChange('days', Number(e.target.value))}
            className="w-full text-base md:text-xs border border-gray-200 rounded-lg px-2 py-2 md:py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 sm:w-auto min-h-[44px] md:min-h-0"
          >
            <option value={0}>Toute période</option>
            <option value={1}>Aujourd&apos;hui</option>
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 derniers jours</option>
          </select>
        </div>

        {filtering ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune activité enregistrée</p>
          </div>
        ) : (
          <div>
            <div className="px-5 py-2 border-b border-gray-100">
              <span className="text-xs text-gray-400">
                {logs.length} activité{logs.length !== 1 ? 's' : ''} affichée{logs.length !== 1 ? 's' : ''} sur {totalLogs}
              </span>
            </div>
            <ul className="divide-y divide-gray-100">
              {logs.map(log => {
                const conf = ACTION_ICONS[log.action_type] ?? { Icon: ClipboardList, cls: 'text-gray-400', group: '' }
                const { Icon } = conf
                const logInitials = (log.user_name ?? '?').split(/[\s@]/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()

                return (
                  <li key={log.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="w-8 h-8 bg-[#F0FDF4] text-[#166534] rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {logInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">{log.user_name || 'Système'}</span>{' '}
                        {log.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatRelative(log.created_at)}</p>
                    </div>
                    <div className={`w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 ${conf.cls}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </li>
                )
              })}
            </ul>

            {hasMore ? (
              <div className="px-5 py-4 border-t border-gray-100">
                <button
                  onClick={() => applyLogFilters({ offset: logOffset, append: true })}
                  disabled={loadingMore}
                  className="border border-[#E7E5E4] rounded-lg text-sm text-[#78716C] px-4 py-2 hover:bg-[#F5F5F4] w-full flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#78716C] border-t-transparent rounded-full animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    'Charger plus'
                  )}
                </button>
              </div>
            ) : (
              <div className="px-5 py-3 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">Toutes les activités sont affichées</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-1">Retirer ce membre ?</h3>
            <p className="text-sm text-gray-500 mb-1">{confirmDelete.name ?? confirmDelete.email}</p>
            {deleteError ? (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{deleteError}</p>
            ) : (
              <p className="text-sm text-gray-400 mb-5">
                {confirmDelete.status === 'pending'
                  ? "L'invitation sera annulée."
                  : "Ce membre n'aura plus accès à votre boutique."}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => { setConfirmDelete(null); setDeleteError(null) }}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-150 ease-out hover:bg-red-700 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-red-600/40 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:ring-0 disabled:active:scale-100"
              >
                {isPending ? 'Suppression...' : 'Retirer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
