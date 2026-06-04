'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Search, LayoutGrid, List, Plus, Package, SearchX,
  ImageOff, Pencil, Trash2, Eye, ChevronDown,
} from 'lucide-react'
import type { Product } from '@hanut/types'
import type { ProductInput } from '@/app/(dashboard)/catalog/actions'
import ProductModal from './ProductModal'

type ViewMode = 'grid' | 'list'
type SortMode = 'newest' | 'price_asc' | 'price_desc' | 'low_stock'
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

type Props = {
  products: Product[]
  role: string
  upsertProduct: (input: ProductInput) => Promise<{ error?: string }>
  deleteProduct: (id: string) => Promise<{ error?: string }>
}

function getStockBadge(product: Product) {
  const isNew = new Date(product.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  if (product.stock === 0) return { label: 'Rupture', className: 'bg-red-600 text-white' }
  if (product.stock <= product.low_stock_alert) return { label: 'Stock bas', className: 'bg-amber-500 text-white' }
  if (isNew) return { label: 'Nouveau', className: 'bg-[#0B5E46] text-white' }
  return null
}

function StockBar({ stock, low_stock_alert }: { stock: number; low_stock_alert: number }) {
  const maxRef = Math.max(low_stock_alert * 4, stock, 10)
  const pct = Math.min((stock / maxRef) * 100, 100)
  const barColor = pct > 50 ? 'bg-[#16A34A]' : pct > 20 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="h-1.5 rounded-full bg-[#E7E5E4]">
      <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function ProductCard({
  product,
  onEdit,
  canWrite,
}: {
  product: Product
  onEdit: (p: Product) => void
  canWrite: boolean
}) {
  const badge = getStockBadge(product)
  const margin =
    product.cost && product.price > 0
      ? Math.round(((product.price - product.cost) / product.price) * 100)
      : null
  const variantLabels = product.variants
    .slice(0, 4)
    .map(v => v.size || v.color || '')
    .filter(Boolean)
  const extraVariants = product.variants.length > 4 ? product.variants.length - 4 : 0

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-xl overflow-hidden group hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative aspect-square bg-[#F0FDF4]">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k="
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#78716C]">
            <ImageOff className="w-8 h-8 opacity-30" />
            <span className="text-xs">Ajouter une photo</span>
          </div>
        )}
        {/* Hover overlay */}
        {canWrite && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={() => onEdit(product)}
              className="bg-white text-[#1C1917] text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-[#FAFAF9] transition-colors"
            >
              Changer la photo
            </button>
          </div>
        )}
        {/* Badge */}
        {badge && (
          <span
            className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-3 sm:p-4">
        <div>
          <p className="text-base font-semibold text-[#1C1917] truncate">{product.name}</p>
          <p className="text-lg font-bold text-[#16A34A]">{product.price} DT</p>
          {product.cost != null && (
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-[#78716C]">Coût : {product.cost} DT</span>
              {margin !== null && (
                <span className="text-xs text-[#78716C]">Marge : {margin}%</span>
              )}
            </div>
          )}
        </div>

        {/* Stock */}
        <div>
          <p className="text-xs text-[#78716C] mb-1">
            Stock : {product.stock} unité{product.stock !== 1 ? 's' : ''}
          </p>
          <StockBar stock={product.stock} low_stock_alert={product.low_stock_alert} />
        </div>

        {/* Variant pills */}
        {product.variants.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {variantLabels.map((label, i) => (
              <span
                key={i}
                className="text-xs border border-[#E7E5E4] rounded-md px-2 py-0.5 text-[#78716C]"
              >
                {label}
              </span>
            ))}
            {extraVariants > 0 && (
              <span className="text-xs border border-[#E7E5E4] rounded-md px-2 py-0.5 text-[#78716C]">
                +{extraVariants} autres
              </span>
            )}
          </div>
        )}

        {/* Actions — visible on hover */}
        <div className="flex gap-2 pt-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          {canWrite && (
            <button
              onClick={() => onEdit(product)}
              className="btn-secondary flex-1 text-sm py-1.5"
            >
              Modifier
            </button>
          )}
          <Link
            href={`/catalog/${product.id}`}
            className="btn-secondary flex-1 text-sm py-1.5 text-center"
          >
            Voir
          </Link>
        </div>
      </div>
    </div>
  )
}

function ProductListMobileCard({
  product,
  onEdit,
  onDelete,
  canWrite,
}: {
  product: Product
  onEdit: (p: Product) => void
  onDelete: (p: Product) => void
  canWrite: boolean
}) {
  const badge = getStockBadge(product)
  const margin =
    product.cost && product.price > 0
      ? Math.round(((product.price - product.cost) / product.price) * 100)
      : null
  const maxRef = Math.max(product.low_stock_alert * 4, product.stock, 10)
  const stockPct = Math.min((product.stock / maxRef) * 100, 100)
  const stockBarColor =
    stockPct > 50 ? 'bg-[#16A34A]' : stockPct > 20 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="mb-3 bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-4">
      <div className="flex gap-3">
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#F0FDF4] flex-shrink-0 flex items-center justify-center">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="64px"
              className="object-cover"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k="
            />
          ) : (
            <ImageOff className="w-5 h-5 text-[#78716C] opacity-40" />
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-[#1C1917] truncate">{product.name}</p>
            </div>
            {badge ? (
              <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                {badge.label}
              </span>
            ) : (
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200">
                En stock
              </span>
            )}
          </div>

          <p className="text-xs text-[#78716C] truncate">
            <span className="font-semibold text-[#16A34A]">{product.price} DT</span>
            {product.cost != null && <> · Coût: {product.cost} DT</>}
            {margin != null && <> · Marge: {margin}%</>}
          </p>

          <div className="mt-1 flex items-center gap-2">
            <span className="shrink-0 text-xs text-[#78716C]">Stock: {product.stock}</span>
            <div className="h-1.5 flex-1 rounded-full bg-[#E7E5E4]">
              <div className={`h-1.5 rounded-full ${stockBarColor}`} style={{ width: `${stockPct}%` }} />
            </div>
          </div>
          <p className="text-xs text-[#78716C]">Variantes: {product.variants.length}</p>
        </div>
      </div>

      <div className="mt-3 border-t border-[#E7E5E4] pt-3">
        <div className="grid grid-cols-3 gap-2">
        {canWrite && (
          <button
            onClick={() => onEdit(product)}
            className="min-h-[44px] flex items-center justify-center rounded-lg border border-[#E7E5E4] text-sm font-medium text-[#1C1917]"
          >
            Modifier
          </button>
        )}
        {canWrite && (
          <Link
            href={`/catalog/${product.id}`}
            className="min-h-[44px] flex items-center justify-center rounded-lg border border-[#E7E5E4] text-sm font-medium text-[#1C1917]"
          >
            Voir
          </Link>
        )}
        {canWrite && (
          <button
            onClick={() => onDelete(product)}
            className="min-h-[44px] flex items-center justify-center rounded-lg border border-red-200 text-sm font-medium text-red-600"
          >
            Suppr.
          </button>
        )}
        {!canWrite && (
          <Link
            href={`/catalog/${product.id}`}
            className="col-span-3 min-h-[44px] flex items-center justify-center rounded-lg border border-[#E7E5E4] text-sm font-medium text-[#1C1917]"
          >
            Voir le détail
          </Link>
        )}
        </div>
      </div>
    </div>
  )
}

export default function CatalogClient({ products, role, upsertProduct, deleteProduct }: Props) {
  const [view, setView] = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('newest')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [modal, setModal] = useState<null | 'new' | Product>(null)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const canWrite = role !== 'readonly'

  const filtered = useMemo(() => {
    let result = [...products]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q))
    }
    if (stockFilter === 'in_stock') result = result.filter(p => p.stock > p.low_stock_alert)
    else if (stockFilter === 'low_stock') result = result.filter(p => p.stock <= p.low_stock_alert && p.stock > 0)
    else if (stockFilter === 'out_of_stock') result = result.filter(p => p.stock === 0)

    if (sort === 'newest') result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (sort === 'price_asc') result.sort((a, b) => a.price - b.price)
    else if (sort === 'price_desc') result.sort((a, b) => b.price - a.price)
    else if (sort === 'low_stock') result.sort((a, b) => a.stock - b.stock)

    return result
  }, [products, search, sort, stockFilter])

  function handleDelete(id: string) {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteProduct(id)
      if (result?.error) {
        setDeleteError(result.error)
      } else {
        setConfirmDelete(null)
      }
    })
  }

  const selectClass =
    'w-full min-h-[44px] touch-manipulation text-base md:text-sm border border-[#E7E5E4] rounded-lg px-3 py-2 bg-white text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 cursor-pointer appearance-none pr-8'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1C1917] sm:text-2xl">Catalogue</h1>
          <p className="text-sm text-[#78716C] mt-0.5">
            {products.length} produit{products.length !== 1 ? 's' : ''}
            {products.filter(p => p.stock <= p.low_stock_alert && p.stock > 0).length > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {products.filter(p => p.stock <= p.low_stock_alert && p.stock > 0).length} stock bas
              </span>
            )}
            {products.filter(p => p.stock === 0).length > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                · {products.filter(p => p.stock === 0).length} rupture
              </span>
            )}
          </p>
        </div>
        {canWrite && (
          <button onClick={() => setModal('new')} className="btn-primary flex w-full items-center justify-center gap-2 text-sm sm:w-auto sm:self-auto">
            <Plus className="w-4 h-4" />
            Nouveau produit
          </button>
        )}
      </div>

      {/* Toolbar: search + view + sort + filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
          <input
            className="input pl-9"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* View toggle */}
        <div className="flex w-full items-center border border-[#E7E5E4] rounded-lg overflow-hidden sm:w-auto">
          <button
            onClick={() => setView('grid')}
            className={`flex flex-1 justify-center px-3 py-2 transition-colors sm:flex-none ${
              view === 'grid'
                ? 'bg-[#0B5E46] text-white'
                : 'text-[#78716C] hover:bg-[#FAFAF9]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex flex-1 justify-center px-3 py-2 transition-colors sm:flex-none ${
              view === 'list'
                ? 'bg-[#0B5E46] text-white'
                : 'text-[#78716C] hover:bg-[#FAFAF9]'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Sort */}
        <div className="relative w-full sm:w-auto">
          <select
            className={selectClass}
            value={sort}
            onChange={e => setSort(e.target.value as SortMode)}
          >
            <option value="newest">Plus récent</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="low_stock">Stock bas en premier</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
        </div>

        {/* Stock filter */}
        <div className="relative w-full sm:w-auto">
          <select
            className={selectClass}
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value as StockFilter)}
          >
            <option value="all">Tous</option>
            <option value="in_stock">En stock</option>
            <option value="low_stock">Stock bas</option>
            <option value="out_of_stock">Rupture</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
        </div>
      </div>

      {/* Empty state — no products at all */}
      {products.length === 0 ? (
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-8 text-center sm:p-16">
          <Package className="w-12 h-12 mx-auto mb-4 text-[#78716C] opacity-30" />
          <p className="font-semibold text-[#1C1917] text-lg mb-1">Votre catalogue est vide</p>
          <p className="text-sm text-[#78716C] mb-6">
            Ajoutez votre premier produit pour commencer à recevoir des commandes
          </p>
          {canWrite && (
            <button onClick={() => setModal('new')} className="btn-primary text-sm inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Ajouter un produit
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state — search/filter has no results */
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-8 text-center sm:p-16">
          <SearchX className="w-12 h-12 mx-auto mb-4 text-[#78716C] opacity-30" />
          <p className="font-semibold text-[#1C1917] mb-1">
            Aucun produit ne correspond à votre recherche
          </p>
          <p className="text-sm text-[#78716C] mb-4">Essayez d&apos;autres termes ou réinitialisez les filtres</p>
          <button
            onClick={() => { setSearch(''); setStockFilter('all') }}
            className="btn-secondary text-sm"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : view === 'grid' ? (
        /* Grid view */
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {filtered.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={setModal}
              canWrite={canWrite}
            />
          ))}
        </div>
      ) : (
        /* List view */
        <>
        <div className="space-y-3 lg:hidden">
          {filtered.map(p => (
            <ProductListMobileCard
              key={p.id}
              product={p}
              onEdit={setModal}
              onDelete={(product) => { setDeleteError(null); setConfirmDelete(product) }}
              canWrite={canWrite}
            />
          ))}
        </div>

        <div className="hidden bg-white border border-[#E7E5E4] rounded-xl shadow-sm overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
              <tr>
                {['Photo', 'Produit', 'Prix', 'Coût / Marge', 'Stock', 'Statut', 'Actions'].map(h => (
                  <th
                    key={h}
                    className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-4 py-3 first:pl-5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {filtered.map(p => {
                const badge = getStockBadge(p)
                const margin =
                  p.cost && p.price > 0
                    ? Math.round(((p.price - p.cost) / p.price) * 100)
                    : null
                const maxRef = Math.max(p.low_stock_alert * 4, p.stock, 10)
                const pct = Math.min((p.stock / maxRef) * 100, 100)
                const barColor =
                  pct > 50 ? 'bg-[#16A34A]' : pct > 20 ? 'bg-amber-500' : 'bg-red-500'

                return (
                  <tr key={p.id} className="hover:bg-[#FAFAF9] transition-colors">
                    <td className="pl-5 pr-3 py-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#F0FDF4] flex-shrink-0 flex items-center justify-center">
                        {p.image_url ? (
                          <Image
                            src={p.image_url}
                            alt={p.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                            placeholder="blur"
                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k="
                          />
                        ) : (
                          <ImageOff className="w-4 h-4 text-[#78716C] opacity-40" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1C1917]">{p.name}</p>
                      {p.variants.length > 0 && (
                        <p className="text-xs text-[#78716C] mt-0.5">
                          {p.variants.length} variante{p.variants.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#1C1917]">{p.price} DT</td>
                    <td className="px-4 py-3 text-[#78716C]">
                      {p.cost != null ? (
                        <div>
                          <span className="text-sm">{p.cost} DT</span>
                          {margin !== null && (
                            <span className="ml-1.5 text-xs font-medium text-[#16A34A] bg-green-50 px-1.5 py-0.5 rounded-full">
                              {margin}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#A8A29E]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24">
                        <p className="text-xs text-[#78716C] mb-1">{p.stock} unités</p>
                        <div className="h-1.5 rounded-full bg-[#E7E5E4]">
                          <div
                            className={`h-1.5 rounded-full ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {badge ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200">
                          En stock
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {canWrite && (
                          <button
                            onClick={() => setModal(p)}
                            className="p-1.5 text-[#78716C] hover:text-[#16A34A] hover:bg-green-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        <Link
                          href={`/catalog/${p.id}`}
                          className="p-1.5 text-[#78716C] hover:text-[#0B5E46] hover:bg-green-50 rounded-lg transition-colors"
                          title="Voir le détail"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {canWrite && (
                          <button
                            onClick={() => { setDeleteError(null); setConfirmDelete(p) }}
                            className="p-1.5 text-[#78716C] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="flex min-h-[100svh] w-full flex-col bg-white shadow-xl sm:min-h-0 sm:max-w-sm sm:rounded-xl sm:border sm:border-[#E7E5E4]">
            <div className="sticky top-0 border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6">
              <h3 className="font-semibold text-[#1C1917]">Supprimer ce produit ?</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <p className="text-sm text-[#78716C] mb-1">
              &quot;{confirmDelete.name}&quot; sera supprimé définitivement.
            </p>
            <p className="text-xs text-[#78716C] mb-4">
              La suppression sera refusée si des commandes sont liées à ce produit.
            </p>
            {deleteError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </div>
            )}
            </div>
            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#E7E5E4] bg-white px-4 py-4 sm:flex-row sm:px-6">
              <button
                onClick={() => { setConfirmDelete(null); setDeleteError(null) }}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                disabled={isPending}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product modal */}
      {canWrite && modal !== null && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={async input => {
            const result = await upsertProduct(input)
            if (result?.error) return result
            setModal(null)
            return {}
          }}
        />
      )}
    </div>
  )
}
