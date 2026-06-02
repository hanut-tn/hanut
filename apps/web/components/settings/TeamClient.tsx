'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { TeamMember } from '@/app/(dashboard)/settings/team/page'

const ROLE_CONFIG = {
  admin:    { label: 'Admin',         cls: 'bg-green-100 text-green-700' },
  operator: { label: 'Opérateur',     cls: 'bg-blue-100 text-blue-700' },
  readonly: { label: 'Lecture seule', cls: 'bg-gray-100 text-gray-600' },
}

const STATUS_CONFIG = {
  active:  { label: 'Actif',       cls: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'En attente',  cls: 'bg-orange-50 text-orange-600' },
}

const MAX_MEMBERS = 5

type Props = {
  plan: 'starter' | 'pro' | 'business'
  sellerId: string
  currentUserId: string
  members: TeamMember[]
}

export default function TeamClient({ plan, currentUserId, members: initialMembers }: Props) {
  const [members, setMembers] = useState(initialMembers)
  const [isPending, startTransition] = useTransition()

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'operator' | 'readonly'>('operator')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  // Delete modal
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Role change
  const [roleError, setRoleError] = useState<string | null>(null)

  if (plan !== 'business') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-700">← Paramètres</Link>
        </div>
        <div className="card p-12 text-center max-w-lg mx-auto">
          <svg className="w-12 h-12 mx-auto mb-4 text-[#78716C] opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Gestion d&apos;équipe</h2>
          <p className="text-gray-500 mb-6">
            Invitez jusqu&apos;à 4 collaborateurs avec des rôles personnalisés.
            Disponible dans le plan <span className="font-semibold text-gray-700">Business</span>.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 transition-colors"
          >
            Passer au plan Business
          </Link>
        </div>
      </div>
    )
  }

  const memberCount = members.length
  const spotsLeft = MAX_MEMBERS - memberCount

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
      if (!res.ok) {
        setInviteError(data.error ?? 'Une erreur est survenue')
        return
      }
      setInviteSuccess(true)
      setInviteEmail('')
      // Refresh member list
      const refreshRes = await fetch('/api/team')
      const refreshData = await refreshRes.json()
      if (refreshData.members) setMembers(refreshData.members)
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
    if (!res.ok) {
      setRoleError(data.error ?? 'Erreur lors du changement de rôle')
      return
    }
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole as TeamMember['role'] } : m))
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleteError(null)

    startTransition(async () => {
      const res = await fetch(`/api/team/${confirmDelete.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.error ?? 'Erreur lors de la suppression')
        return
      }
      setMembers(prev => prev.filter(m => m.id !== confirmDelete.id))
      setConfirmDelete(null)
    })
  }

  function initials(member: TeamMember) {
    const name = member.name ?? member.email
    return name.split(/[\s@]/).map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-700">← Paramètres</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de l&apos;équipe</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {memberCount} / {MAX_MEMBERS} membre{memberCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0FDF4] text-[#166534] border border-green-200 text-sm font-medium">
          <span>{spotsLeft} place{spotsLeft !== 1 ? 's' : ''} disponible{spotsLeft !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {roleError && (
        <div className="rounded-lg px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700">
          {roleError}
        </div>
      )}

      {/* Membres actuels */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Membres</h2>
        </div>

        {members.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <p className="text-sm">Aucun membre pour l&apos;instant. Invitez votre premier collaborateur ci-dessous.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Membre', 'Rôle', 'Statut', 'Date', ''].map((h, i) => (
                  <th key={i} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map(m => {
                const roleConf = ROLE_CONFIG[m.role]
                const statusConf = STATUS_CONFIG[m.status]
                const isSelf = m.user_id === currentUserId
                const date = m.status === 'active' ? m.joined_at : m.invited_at

                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
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
                          <option value="admin">Admin</option>
                          <option value="operator">Opérateur</option>
                          <option value="readonly">Lecture seule</option>
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConf.cls}`}>
                        {m.status === 'pending' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                        )}
                        {statusConf.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">{formatDate(date)}</td>
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
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Inviter un membre */}
      {spotsLeft > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Inviter un collaborateur</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="flex gap-3">
              <input
                type="email"
                className="input flex-1"
                placeholder="email@exemple.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                required
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'operator' | 'readonly')}
                className="input w-44"
              >
                <option value="operator">Opérateur</option>
                <option value="readonly">Lecture seule</option>
              </select>
              <button
                type="submit"
                disabled={isPending || !inviteEmail}
                className="btn-primary whitespace-nowrap"
              >
                {isPending ? 'Envoi...' : 'Envoyer l\'invitation'}
              </button>
            </div>

            {inviteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {inviteError}
              </p>
            )}
            {inviteSuccess && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Invitation envoyée ! Votre collaborateur recevra un email pour créer son compte.
              </p>
            )}

            <div className="text-xs text-gray-400 space-y-0.5">
              <p><span className="font-medium text-gray-600">Opérateur</span> — crée et modifie commandes, catalogue, clients, livraisons. Pas accès aux analytics financiers.</p>
              <p><span className="font-medium text-gray-600">Lecture seule</span> — consulte tout sans pouvoir modifier. Accès aux analytics.</p>
            </div>
          </form>
        </div>
      )}

      {spotsLeft === 0 && (
        <div className="rounded-lg px-4 py-3 text-sm bg-orange-50 border border-orange-200 text-orange-700">
          Limite de {MAX_MEMBERS} membres atteinte. Retirez un membre pour en inviter un nouveau.
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-1">Retirer ce membre ?</h3>
            <p className="text-sm text-gray-500 mb-1">{confirmDelete.name ?? confirmDelete.email}</p>
            {deleteError ? (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {deleteError}
              </p>
            ) : (
              <p className="text-sm text-gray-400 mb-5">
                {confirmDelete.status === 'pending'
                  ? "L'invitation sera annulée."
                  : "Ce membre n'aura plus accès à votre boutique."}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmDelete(null); setDeleteError(null) }}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
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
