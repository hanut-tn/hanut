'use client'

import { useEffect, useState, useTransition, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useShortcut } from '@/lib/use-shortcut'
import Image from 'next/image'
import {
  Search, LayoutGrid, List, Plus, Package, SearchX, ImageOff, Pencil,
  Trash2, ChevronDown, ChevronUp, AlertTriangle, PackageX, CheckCircle2,
  MoreHorizontal, SlidersHorizontal, FileText, Eye, Tag, EyeOff, Star,
} from 'lucide-react'
import type { Product, ProductVariant, ProductWithCategories, Category } from '@hanut/types'
import type { ProductInput, StockAdjustmentInput } from '@/app/(dashboard)/catalog/actions'
import { getVariantLabel } from '@/lib/variants'
import ProductModal from './ProductModal'
import AdjustStockModal from './AdjustStockModal'
import CategoriesModal from './CategoriesModal'

type ViewMode = 'grid' | 'list' | 'restock'
type SortMode =
  | 'newest'
  | 'name_asc' | 'name_desc'
  | 'price_asc' | 'price_desc'
  | 'low_stock' | 'stock_desc'
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
type VisibilityFilter = 'all' | 'featured' | 'hidden'

const VIEW_STORAGE_KEY = 'hanut:catalog-view'

const BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k='

type Props = {
  products: ProductWithCategories[]
  categories: Category[]
  role: string
  upsertProduct: (input: ProductInput) => Promise<{ error?: string }>
  deleteProduct: (id: string) => Promise<{ error?: string }>
  adjustStock: (id: string, input: StockAdjustmentInput) => Promise<{ error?: string }>
  createCategory: (name: string) => Promise<{ category?: Category; error?: string }>
  updateCategory: (id: string, name: string) => Promise<{ error?: string }>
  deleteCategory: (id: string) => Promise<{ error?: string }>
  toggleProductFeatured: (productId: string, isFeatured: boolean, label?: string | null) => Promise<{ error?: string }>
  toggleProductStorefrontVisibility: (productId: string, isVisible: boolean) => Promise<{ error?: string }>
}

// ── Statut stock (sémantique seuil, pas pourcentage) ─────────────────────────
type StockStatus = 'out' | 'low' | 'ok'

function stockStatus(p: Product): StockStatus {
  if (p.stock === 0) return 'out'
  if (p.stock <= p.low_stock_alert) return 'low'
  return 'ok'
}

const STATUS_BAR: Record<StockStatus, string> = {
  ok: 'bg-[#16A34A]',
  low: 'bg-amber-500',
  out: 'bg-red-500',
}

function getStockBadge(product: Product) {
  const isNew = new Date(product.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  if (product.stock === 0) return { label: 'Rupture', className: 'bg-red-600 text-white' }
  if (product.stock <= product.low_stock_alert) return { label: 'Stock bas', className: 'bg-amber-500 text-white' }
  if (isNew) return { label: 'Nouveau', className: 'bg-[#0B5E46] text-white' }
  return null
}

function StockBar({ product }: { product: Product }) {
  const maxRef = Math.max(product.low_stock_alert * 4, product.stock, 10)
  const pct = Math.min((product.stock / maxRef) * 100, 100)
  return (
    <div className="h-1.5 rounded-full bg-[#E7E5E4]">
      <div
        className={`h-1.5 rounded-full transition-all ${STATUS_BAR[stockStatus(product)]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Badges visibilité / mise en avant (image en grille + liste mobile) ────────
function HiddenBadge() {
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-800/80 text-white">
      <EyeOff className="w-2.5 h-2.5" />
      Masqué
    </span>
  )
}

function FeaturedBadge({ product }: { product: Product }) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#16A34A] text-white">
      <Star className="w-2.5 h-2.5 fill-current" />
      {product.featured_label || 'En vedette'}
    </span>
  )
}

// ── Badges catégories ──────────────────────────────────────────────────────────
function CategoryBadges({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {categories.map(c => (
        <span key={c.id} className="text-[10px] leading-4 rounded-full bg-[#F0FDF4] text-[#166534] px-2 py-0.5">
          {c.name}
        </span>
      ))}
    </div>
  )
}

// ── Chips variantes (liste) ───────────────────────────────────────────────────
function VariantChips({ variants }: { variants: ProductVariant[] }) {
  if (variants.length === 0) return null
  const shown = variants.slice(0, 3)
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {shown.map((v, i) => (
        <span key={i} className="text-[10px] leading-4 border border-[#E7E5E4] rounded px-1.5 text-[#78716C]">
          {getVariantLabel(v, i)}
        </span>
      ))}
      {variants.length > 3 && (
        <span className="text-[10px] leading-4 border border-[#E7E5E4] rounded px-1.5 text-[#78716C]">
          +{variants.length - 3}
        </span>
      )}
    </div>
  )
}

// ── Badge variantes + tooltip stock (grille) ──────────────────────────────────
function VariantBadge({ product }: { product: Product }) {
  if (product.variants.length === 0) return null
  return (
    <div className="relative inline-flex group/variants">
      <span className="text-xs border border-[#E7E5E4] rounded-md px-2 py-0.5 text-[#78716C] cursor-default">
        {product.variants.length} variante{product.variants.length > 1 ? 's' : ''}
      </span>
      <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-1.5 hidden w-max max-w-[240px] rounded-lg border border-[#E7E5E4] bg-white p-2.5 shadow-lg sm:group-hover/variants:block">
        <div className="space-y-1">
          {product.variants.map((v, i) => {
            const label = getVariantLabel(v, i)
            return (
              <div key={i} className="flex items-center justify-between gap-4 text-xs">
                <span className="text-[#1C1917] truncate">
                  {label}
                  {v.price != null && <span className="text-[#16A34A] font-medium"> · {v.price} DT</span>}
                </span>
                <span className={`tabular-nums shrink-0 ${v.qty === 0 ? 'text-red-600 font-semibold' : 'text-[#78716C]'}`}>
                  {v.qty === 0 ? 'épuisée' : v.qty}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Menu ⋯ : popover desktop / bottom sheet mobile (portal, échappe aux overflow) ──
function ProductActionsMenu({
  product, canWrite, onAdjust, onDelete, onToggleFeatured, onToggleVisibility,
}: {
  product: Product
  canWrite: boolean
  onAdjust: (p: Product) => void
  onDelete: (p: Product) => void
  onToggleFeatured: (p: Product) => void
  onToggleVisibility: (p: Product) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, close])

  function toggle() {
    if (open) { setOpen(false); return }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) setPos({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) })
    setOpen(true)
  }

  const itemClass =
    'flex w-full items-center gap-2.5 px-4 py-3 text-sm text-[#1C1917] hover:bg-[#FAFAF9] transition-colors min-h-[44px] touch-manipulation'

  const menuItems = (
    <>
      {canWrite && (
        <button type="button" className={itemClass} onClick={() => { close(); onAdjust(product) }}>
          <SlidersHorizontal className="w-4 h-4 text-[#78716C]" />
          Ajuster le stock
        </button>
      )}
      <Link href={`/catalog/${product.id}`} className={itemClass} onClick={close}>
        <FileText className="w-4 h-4 text-[#78716C]" />
        Fiche & mouvements de stock
      </Link>
      {canWrite && (
        <>
          <div className="my-1 border-t border-[#E7E5E4]" />
          <button type="button" className={itemClass} onClick={() => { close(); onToggleFeatured(product) }}>
            <Star className="w-4 h-4 text-[#78716C]" />
            {product.is_featured ? 'Retirer la mise en avant' : 'Mettre en avant'}
          </button>
          <button type="button" className={itemClass} onClick={() => { close(); onToggleVisibility(product) }}>
            {product.is_visible_in_storefront ? (
              <EyeOff className="w-4 h-4 text-[#78716C]" />
            ) : (
              <Eye className="w-4 h-4 text-[#78716C]" />
            )}
            {product.is_visible_in_storefront ? 'Masquer de la boutique' : 'Afficher dans la boutique'}
          </button>
          <div className="my-1 border-t border-[#E7E5E4]" />
        </>
      )}
      {canWrite && (
        <button
          type="button"
          className={`${itemClass} text-red-600 hover:bg-red-50`}
          onClick={() => { close(); onDelete(product) }}
        >
          <Trash2 className="w-4 h-4" />
          Supprimer
        </button>
      )}
    </>
  )

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label={`Actions pour ${product.name}`}
        aria-expanded={open}
        className="min-h-[38px] min-w-[38px] touch-manipulation flex items-center justify-center rounded-lg border border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAFAF9] transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && createPortal(
        <>
          {/* Backdrop : transparent desktop, assombri mobile */}
          <div
            className="fixed inset-0 z-[94] bg-black/30 sm:bg-transparent"
            onClick={close}
            aria-hidden
          />
          {/* Popover desktop */}
          <div
            className="fixed z-[95] hidden w-60 overflow-hidden rounded-xl border border-[#E7E5E4] bg-white py-1 shadow-lg sm:block"
            style={{ top: pos.top, right: pos.right }}
            role="menu"
          >
            {menuItems}
          </div>
          {/* Bottom sheet mobile */}
          <div
            className="fixed inset-x-0 bottom-0 z-[95] rounded-t-2xl border-t border-[#E7E5E4] bg-white pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:hidden"
            role="menu"
          >
            <div className="mx-auto mt-2.5 mb-1 h-1 w-10 rounded-full bg-[#E7E5E4]" />
            <p className="px-4 py-2 text-xs font-medium text-[#78716C] truncate">{product.name}</p>
            {menuItems}
          </div>
        </>,
        document.body
      )}
    </>
  )
}

// ── Carte produit (grille) ────────────────────────────────────────────────────
function ProductCard({
  product, canWrite, onEdit, onAdjust, onDelete, onToggleFeatured, onToggleVisibility,
}: {
  product: ProductWithCategories
  canWrite: boolean
  onEdit: (p: ProductWithCategories) => void
  onAdjust: (p: Product) => void
  onDelete: (p: Product) => void
  onToggleFeatured: (p: Product) => void
  onToggleVisibility: (p: Product) => void
}) {
  const badge = getStockBadge(product)
  const margin =
    product.cost && product.price > 0
      ? Math.round(((product.price - product.cost) / product.price) * 100)
      : null

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-xl overflow-hidden group hover:shadow-md transition-shadow flex flex-col">
      {/* Image */}
      <Link href={`/catalog/${product.id}`} className="relative block aspect-square bg-[#F0FDF4]">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#78716C]">
            <ImageOff className="w-8 h-8 opacity-30" />
            <span className="text-xs">Aucune photo</span>
          </div>
        )}
        <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
              {badge.label}
            </span>
          )}
          {!product.is_visible_in_storefront && <HiddenBadge />}
        </div>
        {product.is_featured && (
          <div className="absolute top-2 right-2 z-10">
            <FeaturedBadge product={product} />
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="p-3 sm:p-4 flex flex-col gap-3 flex-1">
        <div>
          <p className="text-base font-semibold text-[#1C1917] truncate">{product.name}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-lg font-bold text-brand-600">{product.price} DT</p>
            <VariantBadge product={product} />
          </div>
          {product.cost != null && (
            <p className="text-xs text-[#78716C] mt-0.5">
              Achat : {product.cost} DT{margin !== null && <> · Marge : {margin}%</>}
            </p>
          )}
          <CategoryBadges categories={product.categories} />
        </div>

        {/* Stock */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#78716C]">Stock</span>
            <span className={`text-xs font-semibold tabular-nums ${
              stockStatus(product) === 'out' ? 'text-red-600'
              : stockStatus(product) === 'low' ? 'text-amber-600'
              : 'text-[#1C1917]'
            }`}>
              {product.stock}
            </span>
          </div>
          <StockBar product={product} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {canWrite ? (
            <button onClick={() => onEdit(product)} className="btn-secondary flex-1 text-sm py-1.5 min-h-[38px]">
              Modifier
            </button>
          ) : (
            <Link href={`/catalog/${product.id}`} className="btn-secondary flex-1 text-sm py-1.5 min-h-[38px] text-center">
              Voir
            </Link>
          )}
          <ProductActionsMenu
            product={product}
            canWrite={canWrite}
            onAdjust={onAdjust}
            onDelete={onDelete}
            onToggleFeatured={onToggleFeatured}
            onToggleVisibility={onToggleVisibility}
          />
        </div>
      </div>
    </div>
  )
}

// ── Carte liste mobile ────────────────────────────────────────────────────────
function ProductListMobileCard({
  product, canWrite, onEdit, onAdjust, onDelete, onToggleFeatured, onToggleVisibility,
}: {
  product: ProductWithCategories
  canWrite: boolean
  onEdit: (p: ProductWithCategories) => void
  onAdjust: (p: Product) => void
  onDelete: (p: Product) => void
  onToggleFeatured: (p: Product) => void
  onToggleVisibility: (p: Product) => void
}) {
  const badge = getStockBadge(product)

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-3.5">
      <div className="flex gap-3">
        <Link href={`/catalog/${product.id}`} className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#F0FDF4] flex-shrink-0 flex items-center justify-center">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="56px"
              className="object-cover"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          ) : (
            <ImageOff className="w-5 h-5 text-[#78716C] opacity-40" />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-[#1C1917] truncate">{product.name}</p>
            {badge && (
              <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-brand-600">{product.price} DT</p>
          <VariantChips variants={product.variants} />
          <CategoryBadges categories={product.categories} />
          {(product.is_featured || !product.is_visible_in_storefront) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {product.is_featured && <FeaturedBadge product={product} />}
              {!product.is_visible_in_storefront && <HiddenBadge />}
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-[#E7E5E4]">
              <div
                className={`h-1.5 rounded-full ${STATUS_BAR[stockStatus(product)]}`}
                style={{ width: `${Math.min((product.stock / Math.max(product.low_stock_alert * 4, product.stock, 10)) * 100, 100)}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-[#78716C] tabular-nums">{product.stock}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2 border-t border-[#E7E5E4] pt-3">
        {canWrite ? (
          <>
            <button
              onClick={() => onEdit(product)}
              className="flex-1 min-h-[44px] touch-manipulation flex items-center justify-center rounded-lg border border-[#E7E5E4] text-sm font-medium text-[#1C1917]"
            >
              Modifier
            </button>
            <button
              onClick={() => onAdjust(product)}
              className="flex-1 min-h-[44px] touch-manipulation flex items-center justify-center rounded-lg border border-[#E7E5E4] text-sm font-medium text-[#1C1917]"
            >
              Ajuster stock
            </button>
          </>
        ) : (
          <Link
            href={`/catalog/${product.id}`}
            className="flex-1 min-h-[44px] flex items-center justify-center rounded-lg border border-[#E7E5E4] text-sm font-medium text-[#1C1917]"
          >
            Voir le détail
          </Link>
        )}
        <ProductActionsMenu
          product={product}
          canWrite={canWrite}
          onAdjust={onAdjust}
          onDelete={onDelete}
          onToggleFeatured={onToggleFeatured}
          onToggleVisibility={onToggleVisibility}
        />
      </div>
    </div>
  )
}

// ── En-tête de colonne triable ────────────────────────────────────────────────
function SortableTh({
  label, ascMode, descMode, sort, onSort,
}: {
  label: string
  ascMode: SortMode
  descMode: SortMode
  sort: SortMode
  onSort: (m: SortMode) => void
}) {
  const active = sort === ascMode || sort === descMode
  return (
    <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-4 py-3 first:pl-5">
      <button
        type="button"
        onClick={() => onSort(sort === ascMode ? descMode : ascMode)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-[#1C1917] transition-colors ${active ? 'text-[#0B5E46] font-semibold' : ''}`}
      >
        {label}
        {sort === ascMode ? (
          <ChevronUp className="w-3 h-3" />
        ) : sort === descMode ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3 opacity-30" />
        )}
      </button>
    </th>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CatalogClient({
  products, categories, role, upsertProduct, deleteProduct, adjustStock, createCategory, updateCategory, deleteCategory,
  toggleProductFeatured, toggleProductStorefrontVisibility,
}: Props) {
  const [view, setViewState] = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('newest')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [allCategories, setAllCategories] = useState<Category[]>(categories)
  const [showCategoriesModal, setShowCategoriesModal] = useState(false)
  const [modal, setModal] = useState<null | 'new' | ProductWithCategories>(null)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const canWrite = role !== 'readonly'
  useEffect(() => setAllCategories(categories), [categories])
  useShortcut('p', () => setModal('new'), canWrite && modal === null)

  // Vue par défaut : liste sur mobile, choix persisté sinon.
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY)
    if (saved === 'grid' || saved === 'list') {
      setViewState(saved)
    } else if (window.matchMedia('(max-width: 639px)').matches) {
      setViewState('list')
    }
  }, [])

  function setView(v: ViewMode) {
    setViewState(v)
    if (v !== 'restock') localStorage.setItem(VIEW_STORAGE_KEY, v)
  }

  // Recherche avec debounce 300 ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // État local pour les mises à jour optimistes (suppression, ajustement stock),
  // resynchronisé quand le serveur renvoie des données fraîches.
  const [allProducts, setAllProducts] = useState<ProductWithCategories[]>(products)
  useEffect(() => setAllProducts(products), [products])

  const outOfStockCount = allProducts.filter(p => p.stock === 0).length
  const lowStockCount = allProducts.filter(p => p.stock > 0 && p.stock <= p.low_stock_alert).length
  const alertCount = outOfStockCount + lowStockCount

  // Toast
  const [toast, setToast] = useState<string | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function showToast(msg: string) {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast(msg)
    toastRef.current = setTimeout(() => setToast(null), 2000)
  }

  useEffect(() => {
    if (!confirmDelete) return
    const previousOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [confirmDelete])

  const filtered = useMemo(() => {
    let result = [...allProducts]
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q))
    }
    if (stockFilter === 'in_stock') result = result.filter(p => p.stock > p.low_stock_alert)
    else if (stockFilter === 'low_stock') result = result.filter(p => p.stock <= p.low_stock_alert && p.stock > 0)
    else if (stockFilter === 'out_of_stock') result = result.filter(p => p.stock === 0)

    if (visibilityFilter === 'featured') result = result.filter(p => p.is_featured)
    else if (visibilityFilter === 'hidden') result = result.filter(p => !p.is_visible_in_storefront)

    if (categoryFilter !== 'all') {
      result = result.filter(p => p.categories.some(c => c.id === categoryFilter))
    }

    switch (sort) {
      case 'newest':     result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break
      case 'name_asc':   result.sort((a, b) => a.name.localeCompare(b.name, 'fr')); break
      case 'name_desc':  result.sort((a, b) => b.name.localeCompare(a.name, 'fr')); break
      case 'price_asc':  result.sort((a, b) => a.price - b.price); break
      case 'price_desc': result.sort((a, b) => b.price - a.price); break
      case 'low_stock':  result.sort((a, b) => a.stock - b.stock); break
      case 'stock_desc': result.sort((a, b) => b.stock - a.stock); break
    }
    return result
  }, [allProducts, debouncedSearch, sort, stockFilter, visibilityFilter, categoryFilter])

  function handleDelete(id: string) {
    const prev = allProducts
    const deleted = allProducts.find(p => p.id === id)
    setAllProducts(list => list.filter(p => p.id !== id))
    setConfirmDelete(null)
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteProduct(id)
      if (result?.error) {
        setAllProducts(prev)
        setDeleteError(result.error)
        if (deleted) setConfirmDelete(deleted)
      } else {
        showToast('✓ Produit supprimé')
      }
    })
  }

  function openDelete(product: Product) {
    setDeleteError(null)
    setConfirmDelete(product)
  }

  function handleToggleFeatured(product: Product) {
    const nextFeatured = !product.is_featured
    const prev = allProducts
    setAllProducts(list => list.map(p => (p.id === product.id ? { ...p, is_featured: nextFeatured } : p)))
    startTransition(async () => {
      const result = await toggleProductFeatured(product.id, nextFeatured, product.featured_label)
      if (result?.error) {
        setAllProducts(prev)
        showToast(result.error)
      } else {
        showToast(nextFeatured ? '✓ Produit mis en avant' : '✓ Mise en avant retirée')
      }
    })
  }

  function handleToggleVisibility(product: Product) {
    const nextVisible = !product.is_visible_in_storefront
    const prev = allProducts
    setAllProducts(list => list.map(p => (p.id === product.id ? { ...p, is_visible_in_storefront: nextVisible } : p)))
    startTransition(async () => {
      const result = await toggleProductStorefrontVisibility(product.id, nextVisible)
      if (result?.error) {
        setAllProducts(prev)
        showToast(result.error)
      } else {
        showToast(nextVisible ? '✓ Produit affiché dans la boutique' : '✓ Produit masqué de la boutique')
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
            {allProducts.length} produit{allProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canWrite && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowCategoriesModal(true)}
              className="btn-secondary flex flex-1 items-center justify-center gap-2 text-sm sm:flex-none"
            >
              <Tag className="w-4 h-4" />
              Catégories
            </button>
            <button onClick={() => setModal('new')} title="Raccourci : P" className="btn-primary flex flex-1 items-center justify-center gap-2 text-sm sm:flex-none">
              <Plus className="w-4 h-4" />
              Nouveau produit
            </button>
          </div>
        )}
      </div>

      {/* Alerte stock */}
      {alertCount > 0 && view !== 'restock' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{alertCount} produit{alertCount > 1 ? 's' : ''} nécessite{alertCount > 1 ? 'nt' : ''} votre attention</span>
              <span className="hidden sm:inline text-amber-700">
                {' '}({outOfStockCount > 0 && `${outOfStockCount} rupture${outOfStockCount > 1 ? 's' : ''}`}
                {outOfStockCount > 0 && lowStockCount > 0 && ', '}
                {lowStockCount > 0 && `${lowStockCount} stock bas`})
              </span>
            </p>
          </div>
          <button
            onClick={() => setView('restock')}
            className="text-xs text-amber-700 hover:text-amber-900 font-medium whitespace-nowrap underline"
          >
            Voir →
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
          <input
            className="input pl-9"
            aria-label="Rechercher un produit"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex w-full items-center border border-[#E7E5E4] rounded-lg overflow-hidden sm:w-auto">
          <button
            onClick={() => setView('grid')}
            aria-label="Vue grille"
            className={`flex flex-1 justify-center px-3 py-2 transition-colors sm:flex-none ${
              view === 'grid' ? 'bg-[#0B5E46] text-white' : 'text-[#78716C] hover:bg-[#FAFAF9]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            aria-label="Vue liste"
            className={`flex flex-1 justify-center px-3 py-2 transition-colors sm:flex-none ${
              view === 'list' ? 'bg-[#0B5E46] text-white' : 'text-[#78716C] hover:bg-[#FAFAF9]'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('restock')}
            className={`relative flex flex-1 items-center justify-center gap-1.5 px-3 py-2 transition-colors sm:flex-none ${
              view === 'restock' ? 'bg-[#0B5E46] text-white' : 'text-[#78716C] hover:bg-[#FAFAF9]'
            }`}
            title="À réapprovisionner"
          >
            <PackageX className="w-4 h-4" />
            {alertCount > 0 && (
              <span className={`text-[10px] font-bold leading-none px-1 py-0.5 rounded-full ${view === 'restock' ? 'bg-white text-[#0B5E46]' : 'bg-red-500 text-white'}`}>
                {alertCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative w-full sm:w-auto">
          <select className={selectClass} value={sort} onChange={e => setSort(e.target.value as SortMode)} aria-label="Trier">
            <option value="newest">Plus récent</option>
            <option value="name_asc">Nom A→Z</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="low_stock">Stock bas en premier</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
        </div>

        <div className="relative w-full sm:w-auto">
          <select className={selectClass} value={stockFilter} onChange={e => setStockFilter(e.target.value as StockFilter)} aria-label="Filtrer par stock">
            <option value="all">Tous</option>
            <option value="in_stock">En stock</option>
            <option value="low_stock">Stock bas</option>
            <option value="out_of_stock">Rupture</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
        </div>

        {allCategories.length > 0 && (
          <div className="relative w-full sm:w-auto">
            <select className={selectClass} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label="Filtrer par catégorie">
              <option value="all">Toutes catégories</option>
              {allCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
          </div>
        )}

        <div className="flex w-full items-center border border-[#E7E5E4] rounded-lg overflow-hidden sm:w-auto">
          <button
            onClick={() => setVisibilityFilter('all')}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-sm transition-colors sm:flex-none ${
              visibilityFilter === 'all' ? 'bg-[#0B5E46] text-white' : 'text-[#78716C] hover:bg-[#FAFAF9]'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setVisibilityFilter('featured')}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-sm transition-colors sm:flex-none ${
              visibilityFilter === 'featured' ? 'bg-[#0B5E46] text-white' : 'text-[#78716C] hover:bg-[#FAFAF9]'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            En vedette
          </button>
          <button
            onClick={() => setVisibilityFilter('hidden')}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-sm transition-colors sm:flex-none ${
              visibilityFilter === 'hidden' ? 'bg-[#0B5E46] text-white' : 'text-[#78716C] hover:bg-[#FAFAF9]'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            Masqués
          </button>
        </div>
      </div>

      {/* Vue À RÉAPPROVISIONNER */}
      {view === 'restock' && (() => {
        const alertProducts = allProducts
          .filter(p => p.stock === 0 || p.stock <= p.low_stock_alert)
          .sort((a, b) => {
            if (a.stock === 0 && b.stock !== 0) return -1
            if (b.stock === 0 && a.stock !== 0) return 1
            return a.stock - b.stock
          })
        if (alertProducts.length === 0) {
          return (
            <div className="bg-white border border-[#E7E5E4] rounded-xl p-10 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-[#16A34A]" />
              <p className="font-semibold text-[#1C1917]">Tous vos produits ont un stock suffisant</p>
              <p className="text-sm text-[#78716C] mt-1">Aucun produit en rupture ou stock bas.</p>
            </div>
          )
        }
        return (
          <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm divide-y divide-[#E7E5E4] overflow-hidden">
            {alertProducts.map(p => {
              const isOut = p.stock === 0
              const maxRef = Math.max(p.low_stock_alert * 4, p.stock, 10)
              const pct = Math.min((p.stock / maxRef) * 100, 100)

              return (
                <div key={p.id} className="flex items-center gap-4 px-4 py-3 sm:px-5 hover:bg-[#FAFAF9] transition-colors">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#F0FDF4] shrink-0 flex items-center justify-center">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} fill sizes="40px" className="object-cover"
                        placeholder="blur" blurDataURL={BLUR_DATA_URL} />
                    ) : (
                      <ImageOff className="w-4 h-4 text-[#78716C] opacity-40" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-[#1C1917] truncate">{p.name}</p>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        isOut ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isOut ? 'Rupture' : 'Stock bas'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[#78716C]">Stock : {p.stock}</span>
                      <div className="h-1.5 w-20 rounded-full bg-[#E7E5E4]">
                        <div className={`h-1.5 rounded-full ${isOut ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-[#78716C]">Seuil : {p.low_stock_alert}</span>
                    </div>
                    {p.variants.length > 0 && (
                      <p className="text-xs text-[#A8A29E] mt-0.5 truncate">
                        {p.variants.map((v, i) => `${getVariantLabel(v, i)}(${v.qty})`).join(' · ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canWrite && (
                      <button
                        onClick={() => setAdjustProduct(p)}
                        className="text-xs bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        +Stock
                      </button>
                    )}
                    <Link
                      href={`/catalog/${p.id}`}
                      className="p-1.5 text-[#78716C] hover:text-[#0B5E46] hover:bg-green-50 rounded-lg transition-colors"
                      title="Voir le détail"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Grille / Liste */}
      {view !== 'restock' && (allProducts.length === 0 ? (
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
        <div className="bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-8 text-center sm:p-16">
          <SearchX className="w-12 h-12 mx-auto mb-4 text-[#78716C] opacity-30" />
          <p className="font-semibold text-[#1C1917] mb-1">
            Aucun produit ne correspond à votre recherche
          </p>
          <p className="text-sm text-[#78716C] mb-4">Essayez d&apos;autres termes ou réinitialisez les filtres</p>
          <button
            onClick={() => { setSearch(''); setStockFilter('all'); setVisibilityFilter('all') }}
            className="btn-secondary text-sm"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              canWrite={canWrite}
              onEdit={setModal}
              onAdjust={setAdjustProduct}
              onDelete={openDelete}
              onToggleFeatured={handleToggleFeatured}
              onToggleVisibility={handleToggleVisibility}
            />
          ))}
        </div>
      ) : (
        <>
          {/* Liste mobile */}
          <div className="space-y-3 lg:hidden">
            {filtered.map(p => (
              <ProductListMobileCard
                key={p.id}
                product={p}
                canWrite={canWrite}
                onEdit={setModal}
                onAdjust={setAdjustProduct}
                onDelete={openDelete}
                onToggleFeatured={handleToggleFeatured}
                onToggleVisibility={handleToggleVisibility}
              />
            ))}
          </div>

          {/* Table desktop */}
          <div className="hidden bg-white border border-[#E7E5E4] rounded-xl shadow-sm overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
                <tr>
                  <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-4 py-3 pl-5">Photo</th>
                  <SortableTh label="Produit" ascMode="name_asc" descMode="name_desc" sort={sort} onSort={setSort} />
                  <SortableTh label="Prix" ascMode="price_asc" descMode="price_desc" sort={sort} onSort={setSort} />
                  <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-4 py-3">Achat / Marge</th>
                  <SortableTh label="Stock" ascMode="low_stock" descMode="stock_desc" sort={sort} onSort={setSort} />
                  <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-4 py-3">Statut</th>
                  <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-4 py-3">Actions</th>
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

                  return (
                    <tr key={p.id} className="hover:bg-[#FAFAF9] transition-colors">
                      <td className="pl-5 pr-3 py-3">
                        <div className="relative w-10 h-10 rounded-md overflow-hidden bg-[#F0FDF4] flex-shrink-0 flex items-center justify-center">
                          {p.image_url ? (
                            <Image
                              src={p.image_url}
                              alt={p.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                              placeholder="blur"
                              blurDataURL={BLUR_DATA_URL}
                            />
                          ) : (
                            <ImageOff className="w-4 h-4 text-[#78716C] opacity-40" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#1C1917]">{p.name}</p>
                        <VariantChips variants={p.variants} />
                        <CategoryBadges categories={p.categories} />
                        {(p.is_featured || !p.is_visible_in_storefront) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.is_featured && <FeaturedBadge product={p} />}
                            {!p.is_visible_in_storefront && <HiddenBadge />}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#1C1917] whitespace-nowrap">{p.price} DT</td>
                      <td className="px-4 py-3 text-[#78716C]">
                        {p.cost != null ? (
                          <div className="whitespace-nowrap">
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
                          <p className="text-xs text-[#78716C] mb-1 tabular-nums">{p.stock} unité{p.stock !== 1 ? 's' : ''}</p>
                          <div className="h-1.5 rounded-full bg-[#E7E5E4]">
                            <div
                              className={`h-1.5 rounded-full ${STATUS_BAR[stockStatus(p)]}`}
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
                          <ProductActionsMenu
                            product={p}
                            canWrite={canWrite}
                            onAdjust={setAdjustProduct}
                            onDelete={openDelete}
                            onToggleFeatured={handleToggleFeatured}
                            onToggleVisibility={handleToggleVisibility}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ))}

      {/* Confirmation suppression */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[100] overflow-hidden overscroll-contain bg-white sm:flex sm:items-center sm:justify-center sm:bg-black/40 sm:p-4">
          <div className="fixed inset-0 z-[101] flex h-[100dvh] w-full flex-col bg-white shadow-xl sm:relative sm:inset-auto sm:z-auto sm:h-auto sm:max-h-[calc(100dvh-4rem)] sm:max-w-sm sm:rounded-xl sm:border sm:border-[#E7E5E4]">
            <div className="shrink-0 border-b border-[#E7E5E4] bg-white px-4 py-4 sm:px-6">
              <h3 className="font-semibold text-[#1C1917]">Supprimer ce produit ?</h3>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 [-webkit-overflow-scrolling:touch]">
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
            <div className="shrink-0 flex flex-col-reverse gap-2 border-t border-[#E7E5E4] bg-white px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:px-6 sm:pb-4">
              <button
                onClick={() => { setConfirmDelete(null); setDeleteError(null) }}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                disabled={isPending}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-150 ease-out hover:bg-red-700 hover:scale-[1.03] hover:ring-2 hover:ring-offset-1 hover:ring-red-600/40 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:ring-0 disabled:active:scale-100"
              >
                {isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal produit */}
      {canWrite && modal !== null && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          allCategories={allCategories}
          productCategoryIds={modal === 'new' ? [] : modal.categories.map(c => c.id)}
          onManageCategories={() => setShowCategoriesModal(true)}
          onClose={() => setModal(null)}
          onSave={async input => {
            const result = await upsertProduct(input)
            if (result?.error) return result
            setModal(null)
            return {}
          }}
        />
      )}

      {/* Modal catégories */}
      {canWrite && showCategoriesModal && (
        <CategoriesModal
          categories={allCategories}
          onClose={() => setShowCategoriesModal(false)}
          createCategory={createCategory}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
          onChange={setAllCategories}
        />
      )}

      {/* Modal ajustement stock */}
      {canWrite && adjustProduct && (
        <AdjustStockModal
          product={adjustProduct}
          adjustStock={adjustStock}
          onClose={() => setAdjustProduct(null)}
          onSuccess={({ stock, variants }) => {
            setAllProducts(list =>
              list.map(p => (p.id === adjustProduct.id ? { ...p, stock, variants } : p))
            )
            setAdjustProduct(null)
            showToast('✓ Stock ajusté')
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0">
          <div className="rounded-full bg-[#1C1917] px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
        </div>
      )}
    </div>
  )
}
