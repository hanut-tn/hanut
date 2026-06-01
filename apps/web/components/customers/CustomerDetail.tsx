'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import type { OrderStatus } from '@hanut/types'
import type { CustomerInput } from '@/app/(dashboard)/customers/actions'

const STATUS_CONFIG: Record<OrderStatus, { label: string; cls: string }> = {
  pending:   { label: 'En attente', cls: 'bg-orange-100 text-orange-700' },
  new:       { label: 'Nouvelle',   cls: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmée',  cls: 'bg-yellow-100 text-yellow-700' },
  shipped:   { label: 'Expédiée',   cls: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Livrée',     cls: 'bg-green-100 text-green-700' },
  returned:  { label: 'Retournée',  cls: 'bg-red-100 text-red-700' },
}

const TAG_SUGGESTIONS = ['VIP', 'Fidèle', 'Retours fréquents', 'À risque', 'Nouveau']

const TAG_COLORS = [
  'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
]

function tagColor(tag: string) {
  const hash = tag.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return TAG_COLORS[hash % TAG_COLORS.length]
}

type Order = {
  id: string
  cod_amount: number
  status: string
  variant?: string
  quantity: number
  created_at: string
  product: { id: string; name: string } | { id: string; name: string }[] | null
}

type CustomerData = {
  id: string
  name: string
  phone: string
  address?: string
  city?: string
  created_at: string
  tags: string[]
  notes: string
}

type Stats = {
  total_spent: number
  order_count: number
  delivery_rate: number
  favorite_product: string | null
}

type Props = {
  customer: CustomerData
  orders: Order[]
  stats: Stats
  updateCustomer: (id: string, input: CustomerInput) => Promise<void>
}

export default function CustomerDetail({ customer, orders, stats, updateCustomer }: Props) {
  const [isPending, startTransition] = useTransition()

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState(customer.name)
  const [editPhone, setEditPhone] = useState(customer.phone)
  const [editAddress, setEditAddress] = useState(customer.address ?? '')
  const [editCity, setEditCity] = useState(customer.city ?? '')
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Tags
  const [tags, setTags] = useState<string[]>(customer.tags)
  const [showTagInput, setShowTagInput] = useState(false)
  const [tagInput, setTagInput] = useState('')

  // Notes
  const [notes, setNotes] = useState(customer.notes)
  const [notesSaved, setNotesSaved] = useState(false)
  const notesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function persistTags(newTags: string[]) {
    await fetch(`/api/customers/${customer.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: newTags }),
    })
  }

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed || tags.includes(trimmed)) return
    const next = [...tags, trimmed]
    setTags(next)
    persistTags(next)
    setTagInput('')
    setShowTagInput(false)
  }

  function removeTag(tag: string) {
    const next = tags.filter(t => t !== tag)
    setTags(next)
    persistTags(next)
  }

  function onNotesChange(value: string) {
    setNotes(value)
    setNotesSaved(false)
    if (notesTimeout.current) clearTimeout(notesTimeout.current)
    notesTimeout.current = setTimeout(async () => {
      await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value }),
      })
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    }, 1000)
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    setEditMsg(null)
    startTransition(async () => {
      try {
        await updateCustomer(customer.id, {
          name: editName,
          phone: editPhone,
          address: editAddress,
          city: editCity,
        })
        setEditMsg({ type: 'success', text: 'Client mis à jour.' })
        setTimeout(() => setEditOpen(false), 800)
      } catch (err) {
        setEditMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur inconnue' })
      }
    })
  }

  const initials = customer.name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
  const suggestions = TAG_SUGGESTIONS.filter(t => !tags.includes(t))

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back */}
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        ← Retour aux clients
      </Link>

      {/* ── INFOS PRINCIPALES ── */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 bg-brand-100 text-brand-700 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              <button
                onClick={() => { setEditOpen(true); setEditMsg(null) }}
                className="btn-secondary text-sm shrink-0"
              >
                Modifier
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
              <span className="font-mono">{customer.phone}</span>
              {customer.city && <span>{customer.city}</span>}
              {customer.address && <span className="text-gray-400">{customer.address}</span>}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Client depuis le{' '}
              {new Date(customer.created_at).toLocaleDateString('fr-TN', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Commandes', value: String(stats.order_count), color: 'text-gray-900' },
          { label: 'CA livré', value: `${stats.total_spent.toFixed(0)} DT`, color: 'text-green-600' },
          { label: 'Taux livraison', value: `${stats.delivery_rate}%`, color: 'text-gray-900' },
          { label: 'Produit préféré', value: stats.favorite_product ?? '—', color: 'text-gray-900' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-lg font-bold truncate ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── TAGS + NOTES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tags */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Tags</h2>
          <div className="flex flex-wrap gap-2 mb-3 min-h-[28px]">
            {tags.length === 0 && !showTagInput && (
              <span className="text-sm text-gray-400">Aucun tag.</span>
            )}
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => removeTag(tag)}
                title="Cliquer pour supprimer"
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-70 ${tagColor(tag)}`}
              >
                {tag}
                <span className="text-[10px] opacity-60">×</span>
              </button>
            ))}
          </div>

          {showTagInput ? (
            <div className="space-y-2">
              <input
                autoFocus
                className="input text-sm"
                placeholder="Nom du tag…"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) }
                  if (e.key === 'Escape') { setShowTagInput(false); setTagInput('') }
                }}
              />
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => addTag(s)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => { setShowTagInput(false); setTagInput('') }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowTagInput(true)}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium"
            >
              + Ajouter un tag
            </button>
          )}
        </div>

        {/* Notes */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Notes internes</h2>
            {notesSaved && <span className="text-xs text-green-600 font-medium">✓ Sauvegardé</span>}
          </div>
          <textarea
            className="input text-sm resize-none"
            rows={5}
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
            placeholder="Ajouter une note sur ce client..."
          />
        </div>
      </div>

      {/* ── HISTORIQUE COMMANDES ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            Historique des commandes
            {orders.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">{orders.length}</span>
            )}
          </h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-3xl mb-3">📦</p>
            <p>Aucune commande pour ce client.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Date', 'Produit', 'Montant', 'Statut'].map((h, i) => (
                  <th key={i} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(order => {
                const st = STATUS_CONFIG[order.status as OrderStatus]
                const product = Array.isArray(order.product) ? order.product[0] : order.product
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('fr-TN', {
                        day: '2-digit', month: 'short', year: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-gray-700">{product?.name ?? '—'}</p>
                      {order.variant && <p className="text-xs text-gray-400">{order.variant}</p>}
                      {order.quantity > 1 && <p className="text-xs text-gray-400">× {order.quantity}</p>}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{order.cod_amount} DT</td>
                    <td className="px-5 py-3.5">
                      {st ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">{order.status}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── EDIT MODAL ── */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full shadow-xl space-y-4">
            <h3 className="font-semibold text-gray-900 text-lg">Modifier le client</h3>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                <input
                  className="input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                <input
                  className="input"
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input
                    className="input"
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    placeholder="Rue, numéro…"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                  <input
                    className="input"
                    value={editCity}
                    onChange={e => setEditCity(e.target.value)}
                    placeholder="Tunis, Sfax…"
                  />
                </div>
              </div>
              {editMsg && (
                <div className={`rounded-lg px-3 py-2.5 text-sm ${
                  editMsg.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {editMsg.text}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1">
                  {isPending ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
