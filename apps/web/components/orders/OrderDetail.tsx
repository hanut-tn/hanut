'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { OrderStatus } from '@hanut/types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; cls: string; dot: string }> = {
  pending:   { label: 'En attente',  cls: 'bg-orange-100 text-orange-700',  dot: 'bg-orange-400' },
  new:       { label: 'Nouvelle',    cls: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-400' },
  confirmed: { label: 'Confirmée',   cls: 'bg-yellow-100 text-yellow-700',  dot: 'bg-yellow-400' },
  shipped:   { label: 'Expédiée',    cls: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-400' },
  delivered: { label: 'Livrée',      cls: 'bg-green-100 text-green-700',    dot: 'bg-green-400' },
  returned:  { label: 'Retournée',   cls: 'bg-red-100 text-red-700',        dot: 'bg-red-400' },
}

type Props = {
  order: {
    id: string
    status: string
    cod_amount: number
    variant?: string | null
    quantity: number
    notes?: string | null
    created_at: string
  }
  customer: { id: string; name: string; phone: string; address?: string | null; city?: string | null } | null
  product: { id: string; name: string; price: number } | null
  linkedCustomer: { id: string; name: string } | null
  hasExistingCustomer: boolean
}

export default function OrderDetail({ order, customer, product, linkedCustomer, hasExistingCustomer }: Props) {
  const router = useRouter()
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [bannerLoading, setBannerLoading] = useState(false)
  const [bannerDone, setBannerDone] = useState(false)

  const st = STATUS_CONFIG[order.status as OrderStatus]
  const isPending = order.status === 'pending'

  async function linkToExisting() {
    if (!linkedCustomer) return
    setBannerLoading(true)
    await fetch(`/api/orders/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: linkedCustomer.id }),
    })
    setBannerDone(true)
    setBannerLoading(false)
    router.refresh()
  }

  async function createAndLink() {
    if (!customer) return
    setBannerLoading(true)
    // Create customer then link
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: customer.name,
        phone: customer.phone,
        address: customer.address ?? null,
        city: customer.city ?? null,
      }),
    })
    if (res.ok) {
      const { id: newCustomerId } = await res.json()
      await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: newCustomerId }),
      })
    }
    setBannerDone(true)
    setBannerLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        ← Retour aux commandes
      </Link>

      {/* Header */}
      <div className="card p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-gray-400 mb-1">
            {new Date(order.created_at).toLocaleDateString('fr-TN', {
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
            {isPending && (
              <span className="ml-2 text-orange-500 font-medium">· Via lien public</span>
            )}
          </p>
          <p className="text-xl font-bold text-gray-900">{order.cod_amount} DT</p>
        </div>
        {st && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${st.cls}`}>
            <span className={`w-2 h-2 rounded-full ${st.dot}`} />
            {st.label}
          </span>
        )}
      </div>

      {/* ── PENDING BANNER ── */}
      {isPending && !bannerDismissed && !bannerDone && (
        hasExistingCustomer && linkedCustomer ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900">
                Ce numéro correspond au client <span className="underline">{linkedCustomer.name}</span>
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                Lier cette commande à ce client existant ?
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
              >
                Ignorer
              </button>
              <button
                onClick={linkToExisting}
                disabled={bannerLoading}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors font-semibold"
              >
                {bannerLoading ? '...' : 'Lier'}
              </button>
            </div>
          </div>
        ) : customer && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-900">Nouveau client détecté</p>
              <p className="text-xs text-green-600 mt-0.5">
                Créer une fiche client pour <span className="font-medium">{customer.phone}</span> ?
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-100 transition-colors"
              >
                Ignorer
              </button>
              <Link
                href={customer.id ? `/customers/${customer.id}` : '#'}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold"
              >
                Voir la fiche
              </Link>
            </div>
          </div>
        )
      )}

      {bannerDone && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 font-medium">
          ✓ Client lié avec succès.
        </div>
      )}

      {/* Product */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Produit</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">{product?.name ?? '—'}</p>
            {order.variant && <p className="text-sm text-gray-500 mt-0.5">{order.variant}</p>}
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900">{order.cod_amount} DT</p>
            {order.quantity > 1 && <p className="text-xs text-gray-400">× {order.quantity}</p>}
          </div>
        </div>
      </div>

      {/* Customer */}
      {customer && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Client</h2>
            <Link
              href={`/customers/${customer.id}`}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium"
            >
              Voir la fiche →
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none">
              {customer.name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{customer.name}</p>
              <p className="text-sm text-gray-400 font-mono">{customer.phone}</p>
              {customer.city && <p className="text-xs text-gray-400">{customer.city}{customer.address ? ` · ${customer.address}` : ''}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-2">Notes</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}
    </div>
  )
}
