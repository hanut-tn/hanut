import { createServerClient } from '@/lib/supabase/server'
import CatalogClient from '@/components/catalog/CatalogClient'
import { upsertProduct, deleteProduct } from './actions'
import type { Product } from '@hanut/types'

export default async function CatalogPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <CatalogClient
      products={(products ?? []) as Product[]}
      upsertProduct={upsertProduct}
      deleteProduct={deleteProduct}
    />
  )
}
