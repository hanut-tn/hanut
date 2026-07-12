import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ma boutique — Hanut',
  robots: { index: false, follow: false },
}

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getVariantLabel } from '@/lib/variants'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import { updateShopBranding } from '@/app/(dashboard)/settings/actions'
import { getStorefrontConfig, updateStorefrontConfig } from './actions'
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
  }
}

export default async function BoutiquePage() {
  const context = await getUserContext()
  if (!context) return null
  if (context.role === 'readonly') redirect('/orders')

  const serviceClient = createServiceClient()

  const headersList = await headers()
  const host = headersList.get('host') ?? 'www.hanut.tn'
  const appUrl = host.startsWith('localhost') ? `http://${host}` : `https://${host}`

  const [{ data: seller }, config, { data: products }, { data: categories }] = await Promise.all([
    serviceClient
      .from('sellers')
      .select('name, slug, shop_name, shop_description, logo_url, banner_url')
      .eq('id', context.sellerId)
      .single(),
    getStorefrontConfig(),
    serviceClient
      .from('products')
      .select('id, name, description, price, stock, variants, image_url, images_gallery, low_stock_alert, product_categories(category_id)')
      .eq('seller_id', context.sellerId)
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
        shopName: seller?.shop_name ?? null,
        shopDescription: seller?.shop_description ?? null,
        logoUrl: seller?.logo_url ?? null,
        bannerUrl: seller?.banner_url ?? null,
      }}
      initialConfig={config}
      appUrl={appUrl}
      previewProducts={((products ?? []) as DbProduct[]).map(toStorefrontProduct)}
      previewCategories={(categories ?? []) as Category[]}
      updateShopBranding={updateShopBranding}
      updateStorefrontConfig={updateStorefrontConfig}
    />
  )
}
