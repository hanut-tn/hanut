'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, Search, Tag, ArrowUpDown } from 'lucide-react'
import type { CustomerInput } from '@/app/(dashboard)/customers/actions'

const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
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
  updateCustomer: (id: string, input: CustomerInput) => Promise<{ error?: string }>
  deleteCustomer: (id: string) => Promise<{ error?: string }>
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
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'total_spent' | 'order_count' | 'last_order'>('name')
  const [isPending, startTransition] = useTransition()

  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const c of customers) for (const t of c.tags ?? []) set.add(t)
    return Array.from(set).sort()
  }, [customers])

  const filtered = useMemo(() => {
    let result = customers
    if (selectedTag) result = result.filter(c => c.tags?.includes(selectedTag))
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.city ?? '').toLowerCase().includes(q)
      )
    }
    const arr = [...result]
    if (sortBy === 'name') return arr.sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === 'total_spent') return arr.sort((a, b) => getStats(b.orders).delivered - getStats(a.orders).delivered)
    if (sortBy === 'order_count') return arr.sort((a, b) => getStats(b.orders).count - getStats(a.orders).count)
    if (sortBy === 'last_order') {
      return arr.sort((a, b) => {
        const aLast = getStats(a.orders).last
        const bLast = getStats(b.orders).last
        if (!aLast && !bLast) return 0
        if (!aLast) return 1
        if (!bLast) return -1
        return new Date(bLast.created_at).getTime() - new Date(aLast.created_at).getTime()
      })
    }
    return arr
  }, [customers, search, selectedTag, sortBy])

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
      const result = await updateCustomer(editCustomer.id, {
        name: editName,
        phone: editPhone,
        address: editAddress,
        city: editCity,
      })
      if (result?.error) {
        setEditMsg({ type: 'error', text: result.error })
      } else {
        setEditMsg({ type: 'success', text: 'Client mis à jour.' })
        setTimeout(() => setEditCustomer(null), 800)
      }
    })
  }

  function handleDelete(c: Customer) {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteCustomer(c.id)
      if (result?.error) {
        setDeleteError(result.error)
      } else {
        setConfirmDelete(null)
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Clients</h1>
          <p className="text-sm text-[#78716C] mt-0.5">{customers.length} client{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/orders/new" className="btn-primary w-full text-center text-sm sm:w-auto">+ Nouvelle commande</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-4">
          <p className="text-sm font-medium text-[#78716C]">Total clients</p>
          <p className="text-2xl font-bold text-[#1C1917] mt-1">{customers.length}</p>
        </div>
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-4">
          <p className="text-sm font-medium text-[#78716C]">CA encaissé</p>
          <p className="text-2xl font-bold text-[#16A34A] mt-1">{totalCA.toFixed(0)} DT</p>
        </div>
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-4">
          <p className="text-sm font-medium text-[#78716C]">Commandes totales</p>
          <p className="text-2xl font-bold text-[#1C1917] mt-1">
            {customers.reduce((s, c) => s + (c.orders?.length ?? 0), 0)}
          </p>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
          <input
            className="input pl-9"
            placeholder="Rechercher par nom, téléphone ou ville…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex w-full items-center gap-1.5 border border-[#E7E5E4] rounded-lg px-3 py-2 text-sm text-[#78716C] bg-white hover:bg-[#F5F5F4] transition-colors sm:w-auto sm:shrink-0">
          <ArrowUpDown className="w-4 h-4 shrink-0" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="min-w-0 flex-1 bg-transparent appearance-none outline-none cursor-pointer text-sm text-[#78716C]"
          >
            <option value="name">Nom (A-Z)</option>
            <option value="total_spent">CA le plus élevé</option>
            <option value="order_count">Plus de commandes</option>
            <option value="last_order">Dernière commande récente</option>
          </select>
        </div>
      </div>

      {/* Filtres par tag */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                selectedTag === tag
                  ? 'bg-[#0B5E46] text-white'
                  : 'border border-[#E7E5E4] text-[#78716C] hover:bg-[#F5F5F4]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Empty */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-16 text-center">
          {selectedTag ? (
            <>
              <Tag className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-40" />
              <p className="font-medium text-[#1C1917]">
                {search.trim() ? (
                  <>
                    Aucun client avec le tag <strong>{selectedTag}</strong> ne correspond à cette recherche
                  </>
                ) : (
                  <>
                    Aucun client avec le tag <strong>{selectedTag}</strong>
                  </>
                )}
              </p>
              <button
                onClick={() => setSelectedTag(null)}
                className="mt-3 text-sm text-[#16A34A] hover:text-[#15803D] font-medium transition-colors"
              >
                Voir tous les clients
              </button>
            </>
          ) : (
            <>
              <Users className="w-10 h-10 mx-auto mb-3 text-[#78716C] opacity-40" />
              <p className="font-medium text-[#1C1917]">
                {search ? 'Aucun client trouvé pour cette recherche' : 'Aucun client pour l\'instant'}
              </p>
              {!search && (
                <p className="text-sm mt-1 text-[#78716C]">
                  Les clients sont créés automatiquement lors de vos commandes.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
              <tr>
                {['Client', 'Téléphone', 'Ville', 'Commandes', 'CA livré', 'Dernière commande', ''].map((h, i) => (
                  <th key={i} className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {filtered.map(c => {
                const stats = getStats(c.orders)
                const tags = c.tags ?? []
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/customers/${c.id}`)}
                    className="hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#F0FDF4] text-[#166534] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-[#1C1917]">{c.name}</p>
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
                    <td className="px-5 py-4 text-[#78716C] font-mono text-xs">{c.phone}</td>
                    <td className="px-5 py-4 text-[#78716C]">{c.city || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {stats.count} cmd{stats.count !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#1C1917]">
                      {stats.delivered > 0 ? `${stats.delivered.toFixed(0)} DT` : <span className="text-gray-300 font-normal">—</span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-[#78716C]">
                      {stats.last
                        ? new Date(stats.last.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: '2-digit' })
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-3 items-center">
                        <Link
                          href={`/orders/new?customer_id=${c.id}`}
                          className="text-xs text-[#16A34A] hover:text-[#15803D] font-medium whitespace-nowrap"
                        >
                          + Commande
                        </Link>
                        <button
                          onClick={() => openEdit(c)}
                          className="text-xs text-[#78716C] hover:text-[#1C1917] font-medium"
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
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-semibold text-[#1C1917] text-lg">Modifier le client</h3>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1">Nom complet *</label>
                <input
                  className="input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1">Téléphone *</label>
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
                  <label className="block text-sm font-medium text-[#1C1917] mb-1">Adresse</label>
                  <input
                    className="input"
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    placeholder="Rue, numéro…"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1">Ville</label>
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
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-[#1C1917] mb-1">Supprimer ce client ?</h3>
            <p className="text-sm text-[#78716C] mb-1">{confirmDelete.name} — {confirmDelete.phone}</p>
            {getStats(confirmDelete.orders).count > 0 && !deleteError && (
              <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-4">
                Ce client a {getStats(confirmDelete.orders).count} commande{getStats(confirmDelete.orders).count > 1 ? 's' : ''}.
                La suppression sera refusée — supprimez d&apos;abord ses commandes.
              </p>
            )}
            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {deleteError}
              </p>
            )}
            {!deleteError && (
              <p className="text-sm text-[#78716C] mb-5">Cette action est irréversible.</p>
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
