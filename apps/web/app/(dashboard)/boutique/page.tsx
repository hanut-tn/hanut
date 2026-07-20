import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ma boutique — Hanut',
  robots: { index: false, follow: false },
}

import { redirect } from 'next/navigation'
import { getVariantLabel } from '@/lib/variants'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import { getStorefrontData } from './actions'
import BoutiqueEditor from '@/components/boutique/BoutiqueEditor'
import type { Category } from '@hanut/types'
import type { StorefrontProduct } from '@/lib/storefront/cart'

type DbVariant = { size?: string; color?: string; qty: number; price?: number | null }
type DbProduct = {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  image_url: string | null
  images_gallery: string[] | null
  low_stock_alert: number
  variants: DbVariant[]
  product_categories: { category_id: string }[] | null
  is_featured: boolean
  featured_label: string | null
}

function toStorefrontProduct(p: DbProduct): StorefrontProduct {
  const variants = (p.variants ?? []).map((v, i) => ({ ...v, label: getVariantLabel(v, i) }))
  const hasVariants = variants.length > 0
  const inStock = variants.filter(v => v.qty > 0)
  const candidates = hasVariants && inStock.length > 0
    ? inStock.map(v => (v.price != null && v.price >= 0 ? v.price : p.price))
    : [p.price]

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    stock: p.stock,
    image_url: p.image_url,
    low_stock_alert: p.low_stock_alert,
    variants,
    hasVariants,
    minPrice: Math.min(...candidates),
    maxPrice: Math.max(...candidates),
    categoryIds: (p.product_categories ?? []).map(pc => pc.category_id),
    images_gallery: p.images_gallery ?? [],
    is_featured: p.is_featured,
    featured_label: p.featured_label,
  }
}

export default async function BoutiquePage() {
  const context = await getUserContext()
  if (!context) return null
  if (context.role === 'readonly') redirect('/orders')

  const serviceClient = createServiceClient()

  const [{ data: seller }, { config, shopInfo }, { data: products }, { data: categories }] = await Promise.all([
    serviceClient
      .from('sellers')
      .select('name, slug')
      .eq('id', context.sellerId)
      .single(),
    getStorefrontData(),
    serviceClient
      .from('products')
      .select('id, name, description, price, stock, variants, image_url, images_gallery, low_stock_alert, is_featured, featured_label, product_categories(category_id)')
      .eq('seller_id', context.sellerId)
      .eq('is_visible_in_storefront', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12),
    serviceClient
      .from('categories')
      .select('id, seller_id, name, position, created_at')
      .eq('seller_id', context.sellerId)
      .order('position'),
  ])

  return (
    <BoutiqueEditor
      seller={{
        name: seller?.name ?? '',
        slug: seller?.slug ?? null,
      }}
      products={((products ?? []) as DbProduct[]).map(toStorefrontProduct)}
      categories={(categories ?? []) as Category[]}
      initialConfig={config}
      initialShopInfo={shopInfo}
    />
  )
}
