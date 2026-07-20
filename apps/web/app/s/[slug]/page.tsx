import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { getVariantLabel } from '@/lib/variants'
import type { StorefrontProduct } from '@/lib/storefront/cart'
import { DEFAULT_STOREFRONT_CONFIG, type Category, type StorefrontConfig } from '@hanut/types'
import StorefrontShell from '@/components/storefront/StorefrontShell'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = createServiceClient()
    const { data: seller } = await supabase
      .from('sellers')
      .select('name, shop_name, shop_description')
      .eq('slug', slug)
      .single()
    if (seller) {
      const displayName = seller.shop_name || seller.name
      return {
        title: `${displayName} — Boutique en ligne`,
        description: seller.shop_description
          || `Commandez chez ${displayName}, paiement à la livraison partout en Tunisie.`,
      }
    }
  } catch {
    // metadata best effort — la page gère l'erreur elle-même
  }
  return { title: 'Boutique — Hanut' }
}

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
  const variants = (p.variants ?? []).map((v, i) => ({
    ...v,
    label: getVariantLabel(v, i),
  }))
  const hasVariants = variants.length > 0

  // Prix effectifs : basés sur les variantes en stock (sinon prix produit).
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

export default async function StorefrontPage({ params }: Props) {
  const { slug } = await params

  let supabase: ReturnType<typeof createServiceClient>
  try {
    supabase = createServiceClient()
  } catch {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center px-4 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-[#1C1917] mb-2">Page temporairement indisponible</h1>
        <p className="text-gray-500 max-w-sm">Contactez le vendeur directement.</p>
      </div>
    )
  }

  const { data: seller } = await supabase
    .from('sellers')
    .select('id, name, slug, shop_name, shop_description, logo_url, banner_url, storefront_config, plan')
    .eq('slug', slug)
    .single()

  if (!seller) notFound()

  const config: StorefrontConfig = {
    ...DEFAULT_STOREFRONT_CONFIG,
    ...(seller.storefront_config as Partial<StorefrontConfig> | null ?? {}),
  }

  // Branding Hanut visible uniquement pour le plan Starter — Pro/Business
  // ont une boutique en marque blanche. Même repli que le reste du code
  // (settings/page.tsx) : un plan manquant est traité comme Starter.
  const showHanutBranding = (seller.plan ?? 'starter') === 'starter'

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, description, price, stock, variants, image_url, images_gallery, low_stock_alert, is_featured, featured_label, product_categories(category_id)')
      .eq('seller_id', seller.id)
      .eq('is_visible_in_storefront', true)
      .order('is_featured', { ascending: false })
      .order('name')
      .limit(200),
    supabase
      .from('categories')
      .select('id, seller_id, name, position, created_at')
      .eq('seller_id', seller.id)
      .order('position'),
  ])

  const storefrontProducts = ((products ?? []) as DbProduct[]).map(toStorefrontProduct)

  return (
    <StorefrontShell
      sellerSlug={slug}
      sellerName={seller.shop_name || seller.name}
      shopDescription={seller.shop_description ?? null}
      logoUrl={seller.logo_url ?? null}
      bannerUrl={seller.banner_url ?? null}
      products={storefrontProducts}
      categories={(categories ?? []) as Category[]}
      config={config}
      showHanutBranding={showHanutBranding}
    />
  )
}
