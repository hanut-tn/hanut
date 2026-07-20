import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Catalogue — Hanut',
  robots: { index: false, follow: false },
}

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { redirect } from 'next/navigation'
import CatalogClient from '@/components/catalog/CatalogClient'
import {
  upsertProduct, deleteProduct, adjustStock,
  getCategories, createCategory, updateCategory, deleteCategory,
  toggleProductFeatured, toggleProductStorefrontVisibility,
} from './actions'
import type { Product, ProductWithCategories, Category } from '@hanut/types'

type DbProductRow = Product & {
  product_categories: { category: Category }[] | null
}

export default async function CatalogPage() {
  const context = await getUserContext()
  if (!context) return null
  if (context.role === 'readonly') redirect('/orders')

  const supabase = await createServerClient()

  const [{ data: products }, categories] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_categories(category:categories(id, seller_id, name, position, created_at))')
      .eq('seller_id', context.sellerId)
      .order('created_at', { ascending: false })
      .limit(200),
    getCategories(),
  ])

  const productsWithCategories: ProductWithCategories[] = ((products ?? []) as DbProductRow[]).map(p => ({
    ...p,
    categories: (p.product_categories ?? []).map(pc => pc.category),
  }))

  return (
    <CatalogClient
      role={context.role}
      products={productsWithCategories}
      categories={categories}
      upsertProduct={upsertProduct}
      deleteProduct={deleteProduct}
      adjustStock={adjustStock}
      createCategory={createCategory}
      updateCategory={updateCategory}
      deleteCategory={deleteCategory}
      toggleProductFeatured={toggleProductFeatured}
      toggleProductStorefrontVisibility={toggleProductStorefrontVisibility}
    />
  )
}
