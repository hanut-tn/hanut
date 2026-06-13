import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Catalogue — Hanut',
  robots: { index: false, follow: false },
}

import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { redirect } from 'next/navigation'
import CatalogClient from '@/components/catalog/CatalogClient'
import { upsertProduct, deleteProduct } from './actions'
import type { Product } from '@hanut/types'

export default async function CatalogPage() {
  const context = await getUserContext()
  if (!context) return null
  if (context.role === 'readonly') redirect('/orders')

  const supabase = await createServerClient()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', context.sellerId)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <CatalogClient
      role={context.role}
      products={(products ?? []) as Product[]}
      upsertProduct={upsertProduct}
      deleteProduct={deleteProduct}
    />
  )
}
