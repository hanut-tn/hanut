'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CustomerInput } from '@/app/(dashboard)/customers/actions'

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
  created_at: string
}

type Customer = {
  id: string
  name: string
  phone: string
  address?: string
  city?: string
  created_at: string
  tags?: string[] | null
  orders: Order[] | null
}

type Props = {
  customers: Customer[]
  updateCustomer: (id: string, input: CustomerInput) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
}

function getStats(orders: Order[] | null) {
  const list = orders ?? []
  const total = list.reduce((s, o) => s + o.cod_amount, 0)
  const delivered = list.filter(o => o.status === 'delivered').reduce((s, o) => s + o.cod_amount, 0)
  const last = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  return { count: list.length, total, delivered, last }
}

export default function CustomersClient({ customers, updateCustomer, deleteCustomer }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  // Edit modal
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Delete modal
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return customers
    const q = search.toLowerCase()
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.city ?? '').toLowerCase().includes(q)
    )
  }, [customers, search])

  const totalCA = customers.reduce((s, c) => s + getStats(c.orders).delivered, 0)

  function openEdit(c: Customer) {
    setEditCustomer(c)
    setEditName(c.name)
    setEditPhone(c.phone)
    setEditAddress(c.address ?? '')
    setEditCity(c.city ?? '')
    setEditMsg(null)
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editCustomer) return
    setEditMsg(null)
    startTransition(async () => {
      try {
        await updateCustomer(editCustomer.id, {
          name: editName,
          phone: editPhone,
          address: editAddress,
          city: editCity,
        })
        setEditMsg({ type: 'success', text: 'Client mis à jour.' })
        setTimeout(() => setEditCustomer(null), 800)
      } catch (err) {
        setEditMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur inconnue' })
      }
    })
  }

  function handleDelete(c: Customer) {
    setDeleteError(null)
    startTransition(async () => {
      try {
        await deleteCustomer(c.id)
        setConfirmDelete(null)
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{customers.length} client{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/orders/new" className="btn-primary">+ Nouvelle commande</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total clients</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{customers.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">CA encaissé (clients)</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{totalCA.toFixed(0)} DT</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Commandes totales</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {customers.reduce((s, c) => s + (c.orders?.length ?? 0), 0)}
          </p>
        </div>
      </div>

      {/* Search */}
      <input
        className="input max-w-sm"
        placeholder="Rechercher par nom, téléphone ou ville…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Empty */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <p className="text-5xl mb-4">👤</p>
          <p className="font-medium text-gray-600">
            {search ? 'Aucun client trouvé pour cette recherche' : 'Aucun client pour l\'instant'}
          </p>
          {!search && (
            <p className="text-sm mt-1 text-gray-400">
              Les clients sont créés automatiquement lors de vos commandes.
            </p>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Client', 'Téléphone', 'Ville', 'Commandes', 'CA livré', 'Dernière commande', ''].map((h, i) => (
                  <th key={i} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(c => {
                const stats = getStats(c.orders)
                const tags = c.tags ?? []
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/customers/${c.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tags.map(tag => (
                                <span
                                  key={tag}
                                  className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${tagColor(tag)}`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600 font-mono text-xs">{c.phone}</td>
                    <td className="px-5 py-4 text-gray-500">{c.city || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {stats.count} cmd{stats.count !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {stats.delivered > 0 ? `${stats.delivered.toFixed(0)} DT` : <span className="text-gray-300 font-normal">—</span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {stats.last
                        ? new Date(stats.last.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: '2-digit' })
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-3">
                        <button
                          onClick={() => openEdit(c)}
                          className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                        >
                          Éditer
                        </button>
                        <button
                          onClick={() => { setConfirmDelete(c); setDeleteError(null) }}
                          className="text-xs text-red-400 hover:text-red-600 font-medium"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editCustomer && (
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
                <button type="button" onClick={() => setEditCustomer(null)} className="btn-secondary flex-1">
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

      {/* ── DELETE MODAL ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-1">Supprimer ce client ?</h3>
            <p className="text-sm text-gray-500 mb-1">{confirmDelete.name} — {confirmDelete.phone}</p>
            {getStats(confirmDelete.orders).count > 0 && !deleteError && (
              <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-4">
                Ce client a {getStats(confirmDelete.orders).count} commande{getStats(confirmDelete.orders).count > 1 ? 's' : ''}.
                La suppression sera refusée — supprimez d'abord ses commandes.
              </p>
            )}
            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {deleteError}
              </p>
            )}
            {!deleteError && (
              <p className="text-sm text-gray-400 mb-5">Cette action est irréversible.</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setConfirmDelete(null); setDeleteError(null) }} className="btn-secondary flex-1">
                Annuler
              </button>
              {!deleteError && (
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={isPending}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Suppression...' : 'Supprimer'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
